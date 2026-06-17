import './globals.css';
import ScrollWatcher from './ScrollWatcher';

export const metadata = {
  title: 'PMNinja',
  description: 'Gamified APM interview practice platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Bebas+Neue&family=Press+Start+2P&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen">
        <ScrollWatcher />
        {children}
      </body>
    </html>
  );
}