import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import './styles/page.css';
import { App, OpenFailed } from './App';
import { openStore } from './store';
import { StoreContext } from './store/context';

const element = document.getElementById('root');
if (!element) throw new Error('Missing #root element');
const root = createRoot(element);

openStore().then(
  (store) =>
    root.render(
      <StrictMode>
        <StoreContext.Provider value={store}>
          <App />
        </StoreContext.Provider>
      </StrictMode>,
    ),
  (error: unknown) => {
    console.error(error);
    root.render(<OpenFailed />);
  },
);
