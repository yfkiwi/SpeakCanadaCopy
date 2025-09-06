import '../styles/globals.css';
import { FloatingVocabProvider } from '../components/FloatingVocabButton';

export default function App({ Component, pageProps }) {
  return (
    <FloatingVocabProvider>
      <Component {...pageProps} />
    </FloatingVocabProvider>
  );
}