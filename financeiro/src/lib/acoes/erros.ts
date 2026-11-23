/** Traduz erros do Postgres/PostgREST em frases para a tela. */
export function mensagemDeErro(erro: { code?: string; message: string }, contexto?: string): string {
  switch (erro.code) {
    case "23503":
      return contexto === "excluir"
        ? "Não dá para excluir: existem lançamentos ou câmbios ligados a este item."
        : "O item escolhido não existe mais. Recarregue a página.";
    case "23505":
      return "Já existe um item com esse nome.";
    case "23514":
      return "Algum valor está fora do permitido (valores precisam ser maiores que zero).";
    case "23001":
      return erro.message;
    default:
      return `Não foi possível salvar: ${erro.message}`;
  }
}

export interface EstadoForm {
  erro?: string;
  erros?: Record<string, string>;
  ok?: boolean;
}
