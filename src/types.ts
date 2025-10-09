export type TestCase = {
  title?: string;
  url?: string; // "", "/", "/rota" ou absoluta
  actions?: Action[];
  context?: LocatorContext;
};

export type DescribeBlock = {
  text?: string;
  before?: string | string[];
  [testName: string]: any;
};

export type NewFormat = {
  describe: DescribeBlock;
};

export type SelectOptionInput =
  | { value: string | string[] }
  | { label: string | string[] }
  | { index: number | number[] };

export type ScreenshotInput = {
  path?: string;
  fullPage?: boolean;
};

export type AssertionTextInput = {
  equals?: string | RegExp;
  contains?: string;
  timeout?: number;
};

export type AssertionVisibleInput = string | { timeout?: number };
export type WaitRequestInput = {
  /** Trecho(s) que devem aparecer na URL da resposta */
  urlIncludes: string | string[];
  /** Status esperado (um ou vários). Se ausente, aceita qualquer status. */
  status?: number | number[];
  /** Timeout em ms (default sugerido: 50_000) */
  timeout?: number;
};
export type LocatorContext = {
  /** Seleciona a ocorrência: 0-based. Tem precedência sobre first/last. */
  nth?: number;
  /** Força a primeira ocorrência. */
  first?: boolean;
  /** Força a última ocorrência. */
  last?: boolean;
  /** Escopo (container) para procurar o alvo, ex.: ".modal", "[data-testid=dialog]". */
  within?: string;
  /** Iframe para buscar o alvo. Pode ser um seletor ou cadeia de seletores (nested). */
  frame?: string | string[];
};

export type Action = {
  // já existentes
  click?: string; // seletor | texto | "tag > texto"
  type?: string; // suporta faker/date(...)
  typeSlow?: string; // idem, com delay
  loc?: string;
  wait?: number; // ms
  waitRequest?: WaitRequestInput;

  parent?: string;
  root?: string;
  getText?: string;

  nth?: number;
  first?: boolean;
  last?: boolean;
  within?: string;
  frame?: string | string[];

  // novos básicos
  hover?: string; // mesmo esquema do click
  press?: string; // ex.: "Enter", "Control+A", "Meta+K"
  check?: string | { loc: string } | true; // true = legado (deprecado)
  uncheck?: string | { loc: string } | true;
  select?: SelectOptionInput; // select option por value/label/index (requer alvo)
  upload?: string | string[]; // caminho(s) do(s) arquivo(s) (requer alvo)

  // assertions
  expectText?: AssertionTextInput; // valida texto do alvo
  expectVisible?: AssertionVisibleInput; // espera visibilidade do alvo
  expectUrl?: { equals?: string | RegExp; contains?: string; timeout?: number };

  timeout?: number;
  // screenshot
  screenshot?: ScreenshotInput; // tira screenshot da página (sem alvo) ou do alvo (se houver loc/click seletor)
};
