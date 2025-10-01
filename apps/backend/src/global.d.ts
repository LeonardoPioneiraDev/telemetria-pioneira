declare global {
  interface BigInt {
    /**
     * Permite que o JSON.stringify serialize BigInts para strings.
     */
    toJSON(): string;
  }
}

// Adicionar este export vazio é importante para que o TypeScript
// trate este arquivo como um módulo e aplique a alteração globalmente.
export {};
