const percentFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const integerFormat = new Intl.NumberFormat("pt-BR");

export const formatPercent = (value: number) => `${percentFormat.format(value)}%`;
export const formatVotes = (value: number) => `${integerFormat.format(value)} ${value === 1 ? "voto" : "votos"}`;
export const formatInteger = (value: number) => integerFormat.format(value);
