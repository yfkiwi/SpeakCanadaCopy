import '../styles/globals.css';
import { FloatingVocabProvider } from '../components/FloatingVocabButton';
import { WordLookupProvider } from '../contexts/WordLookupContext';
import { useGlobalWordSelection } from '../hooks/useGlobalWordSelection';

function GlobalWordSelection() {
  useGlobalWordSelection();
  return null;
}

export default function App({ Component, pageProps }) {
  return (
    <FloatingVocabProvider>
      <WordLookupProvider>
        <GlobalWordSelection />
        <Component {...pageProps} />
      </WordLookupProvider>
    </FloatingVocabProvider>
  );
}