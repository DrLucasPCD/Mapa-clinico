import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export default function Install() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [message, setMessage] = useState('');
  useEffect(() => {
    const receive = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', receive);
    return () => window.removeEventListener('beforeinstallprompt', receive);
  }, []);
  return (
    <div className="install">
      <button
        className="secondary-button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            const c = await prompt.userChoice;
            if (c.outcome === 'accepted') setMessage('Aplicativo instalado.');
            setPrompt(null);
          } else
            setMessage(
              'No menu do navegador, escolha “Instalar aplicativo” ou “Adicionar à Tela de Início”. No Safari, use Compartilhar → Adicionar à Tela de Início.',
            );
        }}
      >
        <Download size={15} />
        Instalar app
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
