declare global {
  namespace App {
    interface PageData {
      appState?: import('./lib/types').AppState;
    }
  }
}

export {};
