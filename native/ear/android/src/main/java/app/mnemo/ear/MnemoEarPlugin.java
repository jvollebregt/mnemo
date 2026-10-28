package app.mnemo.ear;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/**
 * Listens to a recital with the phone's own on-device recognition. Nothing
 * is sent away: a phone without on-device recognition says so, and the
 * reader types instead.
 *
 * One call to start() is one stretch of listening. It emits "heard" with the
 * words of that stretch so far, and "ended" when it stops, with a problem
 * when it can't go on. The page starts a new stretch after a pause.
 *
 * Keeping a recording alongside isn't offered on Android yet: the recogniser
 * holds the microphone while it listens.
 */
@CapacitorPlugin(name = "MnemoEar", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") })
public class MnemoEarPlugin extends Plugin {

    private SpeechRecognizer recognizer;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("listen", onDevice(getContext()));
        result.put("record", false);
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneAnswered");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void microphoneAnswered(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
        else call.reject("not-allowed");
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (recognizer != null) recognizer.stopListening();
            call.resolve();
        });
    }

    private static boolean onDevice(Context context) {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && SpeechRecognizer.isOnDeviceRecognitionAvailable(context);
    }

    private void begin(PluginCall call) {
        String language = call.getString("language", "en-GB");
        getActivity().runOnUiThread(() -> {
            Context context = getContext();
            if (!onDevice(context)) {
                call.reject("unavailable");
                return;
            }
            close();
            recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(context);
            recognizer.setRecognitionListener(new Listener());
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            recognizer.startListening(intent);
            call.resolve();
        });
    }

    private void close() {
        if (recognizer == null) return;
        recognizer.destroy();
        recognizer = null;
    }

    private void emitHeard(Bundle results) {
        ArrayList<String> texts = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (texts == null || texts.isEmpty() || texts.get(0) == null) return;
        JSObject data = new JSObject();
        data.put("text", texts.get(0));
        notifyListeners("heard", data);
    }

    private void emitEnded(String problem) {
        close();
        JSObject data = new JSObject();
        if (problem != null) data.put("problem", problem);
        notifyListeners("ended", data);
    }

    /** What a recogniser error means for the page: a pause to listen on through, or a reason to stop. */
    private static String problemOf(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH:
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
            case SpeechRecognizer.ERROR_CLIENT:
                return null;
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "not-allowed";
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio-capture";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED:
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE:
                return "language-not-supported";
            default:
                return "unavailable";
        }
    }

    private class Listener implements RecognitionListener {
        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() {}
        @Override public void onEvent(int eventType, Bundle params) {}

        @Override
        public void onPartialResults(Bundle partialResults) {
            emitHeard(partialResults);
        }

        @Override
        public void onResults(Bundle results) {
            emitHeard(results);
            emitEnded(null);
        }

        @Override
        public void onError(int error) {
            emitEnded(problemOf(error));
        }
    }
}
