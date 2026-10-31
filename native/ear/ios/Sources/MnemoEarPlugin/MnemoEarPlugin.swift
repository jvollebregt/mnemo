import AVFoundation
import Capacitor
import Foundation
import Speech

/// Listens to a recital with the phone's own on-device recognition, and, when
/// the reader keeps their latest recital, records it from the same microphone.
/// Nothing is sent away: a phone without on-device recognition says so, and
/// the reader types instead.
///
/// One call to start() is one stretch of listening. It emits "heard" with the
/// words of that stretch so far, and "ended" when it stops, with a problem
/// when it can't go on. The page starts a new stretch after a pause.
@objc(MnemoEarPlugin)
public class MnemoEarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MnemoEarPlugin"
    public let jsName = "MnemoEar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecording", returnType: CAPPluginReturnPromise)
    ]

    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var wantsRecording = false
    private var recording: AVAudioFile?
    private var recordingURL: URL?

    @objc func available(_ call: CAPPluginCall) {
        let recognizer = SFSpeechRecognizer(locale: Locale(identifier: call.getString("language") ?? "en-GB"))
        call.resolve(["listen": recognizer?.supportsOnDeviceRecognition ?? false, "record": true])
    }

    @objc func start(_ call: CAPPluginCall) {
        let language = call.getString("language") ?? "en-GB"
        SFSpeechRecognizer.requestAuthorization { status in
            guard status == .authorized else { return call.reject("not-allowed") }
            AVAudioSession.sharedInstance().requestRecordPermission { granted in
                DispatchQueue.main.async {
                    guard granted else { return call.reject("not-allowed") }
                    do {
                        try self.begin(language)
                        call.resolve()
                    } catch let problem as EarProblem {
                        call.reject(problem.rawValue)
                    } catch {
                        call.reject(EarProblem.audioCapture.rawValue)
                    }
                }
            }
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.request?.endAudio()
            call.resolve()
        }
    }

    /// Records from the same microphone as listening, into a voice-quality AAC file.
    /// The file is made once the microphone is set up, as its format depends on that.
    @objc func startRecording(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.wantsRecording = true
            if self.engine.isRunning { self.makeRecording() }
            call.resolve()
        }
    }

    private func makeRecording() {
        guard recording == nil else { return }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("recital.m4a")
        try? FileManager.default.removeItem(at: url)
        let format = engine.inputNode.outputFormat(forBus: 0)
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: format.sampleRate,
            AVNumberOfChannelsKey: format.channelCount,
            AVEncoderBitRateKey: 20_000
        ]
        recording = try? AVAudioFile(forWriting: url, settings: settings, commonFormat: .pcmFormatFloat32, interleaved: false)
        recordingURL = recording == nil ? nil : url
    }

    @objc func stopRecording(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // Closing the file finishes it.
            self.wantsRecording = false
            self.recording = nil
            guard let url = self.recordingURL, let data = try? Data(contentsOf: url), !data.isEmpty else {
                return call.resolve([:])
            }
            self.recordingURL = nil
            try? FileManager.default.removeItem(at: url)
            call.resolve(["data": data.base64EncodedString(), "type": "audio/mp4"])
        }
    }

    private func begin(_ language: String) throws {
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: language)) else {
            throw EarProblem.languageNotSupported
        }
        guard recognizer.supportsOnDeviceRecognition, recognizer.isAvailable else { throw EarProblem.unavailable }
        finish()

        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.record, mode: .measurement, options: .duckOthers)
        try session.setActive(true, options: .notifyOthersOnDeactivation)

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        request.requiresOnDeviceRecognition = true
        self.request = request

        if wantsRecording { makeRecording() }
        let input = engine.inputNode
        input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { [weak self] buffer, _ in
            request.append(buffer)
            try? self?.recording?.write(from: buffer)
        }
        engine.prepare()
        try engine.start()

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            DispatchQueue.main.async {
                // A stretch that has already ended can still call back, with a last result or an error, after the
                // next one began. Only the stretch under way may speak, or it would cut the new one short.
                guard let self, self.request === request else { return }
                if let result {
                    self.notifyListeners("heard", data: ["text": result.bestTranscription.formattedString])
                }
                if error != nil || result?.isFinal == true {
                    self.finish()
                    // The recogniser stops after a silence, sometimes with an error; the page listens on.
                    self.notifyListeners("ended", data: [:])
                }
            }
        }
    }

    private func finish() {
        if engine.isRunning { engine.stop() }
        // The tap goes even when the engine never started, or the next stretch couldn't install its own.
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        request = nil
        task = nil
        // Hand the audio back, so a recital kept can be played and other apps' sound comes back.
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

enum EarProblem: String, Error {
    case unavailable = "unavailable"
    case languageNotSupported = "language-not-supported"
    case audioCapture = "audio-capture"
}
