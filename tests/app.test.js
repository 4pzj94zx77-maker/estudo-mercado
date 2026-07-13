const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createElement() {
  return {
    value: "",
    textContent: "",
    hidden: false,
    disabled: false,
    files: [],
    attributes: {},
    children: [],
    dataset: {},
    classList: {
      values: new Set(),
      toggle(name, force) {
        if (force) this.values.add(name);
        else this.values.delete(name);
      },
    },
    addEventListener() {},
    append(...children) {
      this.children.push(...children);
    },
    replaceChildren(...children) {
      this.children = children;
    },
    querySelectorAll() {
      return this.children
        .flatMap((child) => child.children || [])
        .filter((child) => child.type === "checkbox" && child.checked);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    focus() {
      this.focused = true;
    },
  };
}

function loadApplication() {
  const elements = new Map();
  const document = {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, createElement());
      return elements.get(selector);
    },
    createElement() {
      return createElement();
    },
    createTextNode(text) {
      return { textContent: text };
    },
  };
  const context = {
    console,
    document,
    Intl,
    Number,
    RegExp,
    TextDecoder,
    setTimeout,
    window: {
      location: { protocol: "http:" },
      setTimeout,
      print() {},
    },
  };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  vm.runInContext(source, context);
  return { context, element: (selector) => elements.get(selector) };
}

function fillRequiredFields(app) {
  app.element("#clientName").value = "Ana Silva";
  app.element("#street").value = "Rua das Flores, 10";
  app.element("#locality").value = "Lisboa";
  app.element("#propertyType").value = "house";
  app.element("#privateArea").value = "100";
  app.element("#pricePerSqmLow").value = "1000";
  app.element("#pricePerSqmHigh").value = "1000";
}

test("uma moradia conserva e inclui o terreno no cálculo", () => {
  const app = loadApplication();
  fillRequiredFields(app);
  app.element("#landType").value = "urban";
  app.element("#landArea").value = "100";
  app.element("#landReference").value = "rural_low";

  app.context.render();
  const valuation = app.context.getValuation();

  assert.equal(app.element("#landType").disabled, false);
  assert.equal(app.element("#landType").value, "urban");
  assert.equal(valuation.landLowValue, 1500);
  assert.equal(valuation.landHighValue, 4000);
});

test("um apartamento deixa os campos de terreno vazios e ignora o terreno", () => {
  const app = loadApplication();
  fillRequiredFields(app);
  app.element("#propertyType").value = "apartment";
  app.element("#landType").value = "urban";
  app.element("#landArea").value = "100";
  app.element("#landReference").value = "rural_low";

  app.context.render();
  const valuation = app.context.getValuation();

  assert.equal(app.element("#landType").disabled, true);
  assert.equal(app.element("#landType").value, "");
  assert.equal(app.element("#landArea").value, "");
  assert.equal(valuation.landLowValue, 0);
  assert.equal(valuation.landHighValue, 0);
});

test("a exportação só é válida com os campos essenciais", () => {
  const app = loadApplication();
  assert.equal(app.context.validateValuation(), false);
  assert.equal(app.element("#validationSummary").hidden, false);

  fillRequiredFields(app);
  assert.equal(app.context.validateValuation(), true);
  assert.equal(app.element("#validationSummary").hidden, true);
});

test("rejeita um PDF com mais de 10 MB antes de o carregar", async () => {
  const app = loadApplication();
  const file = { size: 10 * 1024 * 1024 + 1 };
  await assert.rejects(app.context.readPdfText(file), /PDF_TOO_LARGE/);
});

test("reconstrói linhas pelas coordenadas e não pela ordem interna do PDF", () => {
  const app = loadApplication();
  const lines = app.context.reconstructPdfLines([
    { str: "125,40 m²", transform: [1, 0, 0, 1, 180, 700], width: 55 },
    { str: "Área bruta privativa:", transform: [1, 0, 0, 1, 20, 700], width: 130 },
    { str: "Lisboa", transform: [1, 0, 0, 1, 180, 680], width: 40 },
    { str: "Concelho:", transform: [1, 0, 0, 1, 20, 680], width: 65 },
  ]);

  assert.deepEqual(Array.from(lines), ["Área bruta privativa: 125,40 m²", "Concelho: Lisboa"]);
});

test("extrai áreas e localidade do texto reconstruído", () => {
  const app = loadApplication();
  const data = app.context.parseCadernetaText([
    "Concelho: Lisboa",
    "Área bruta privativa: 125,40 m²",
    "Área bruta dependente: 18,20 m²",
    "Fração autónoma destinada a habitação",
  ].join("\n"));

  assert.equal(data.locality, "Lisboa");
  assert.equal(data.privateArea, 125.4);
  assert.equal(data.dependentArea, 18.2);
  assert.equal(data.propertyType, "apartment");
});

test("extrai os campos do formato OCR da caderneta fornecida", () => {
  const app = loadApplication();
  const data = app.context.parseCadernetaText([
    "DISTRITO: 14 - SANTAREM CONCELHO: 16 - SANTAREM FREGUESIA: 33 - UNIÃO DE FREGUESIAS",
    "LOCALIZAÇÃO DA FRACÇÃO",
    "Av./Rua/Praça: Praceta João Caetano Brás, nº 1, 2, 3, 4, 5, 6 Nº: 3 Lugar: Santarém Código Postal: 2005-161",
    "Andar/Divisão: 6ºAG",
    "FRACÇÃO AUTÓNOMA: AG",
    "Área bruta privativa: 184,3600 m² Área bruta dependente: 3,1000 m²",
    "TITULARES",
    "Identificação fiscal: 000000000 Nome: ANA SILVA",
    "Morada: Rua de Exemplo, 1",
    "Identificação fiscal: 111111111 Nome: BRUNO MIGUEL COSTA",
  ].join("\n"));

  assert.equal(data.locality, "Santarem");
  assert.equal(data.parish, "União de Freguesias");
  assert.match(data.street, /Praceta João Caetano Brás.*Andar\/Divisão: 6ºAG/i);
  assert.equal(data.privateArea, 184.36);
  assert.equal(data.dependentArea, 3.1);
  assert.equal(data.propertyType, "apartment");
  assert.equal(data.clientName, "Ana Silva e Bruno Costa");
});

test("usa primeiro a freguesia e só depois o concelho para o preço SIR", () => {
  const app = loadApplication();
  app.element("#locality").value = "Santarém";
  app.element("#parish").value = "Alvalade";
  app.element("#propertyType").value = "apartment";
  app.element("#condition").value = "used";
  app.context.window.sirDataState.loaded = true;
  app.context.window.sirDataState.rows = [
    { concelho: "Santarém", freguesia: "Total", tipologia: "Apartamento", estado: "Usado", p25: 1200, media: 1400, p75: 1600, n: 50 },
    { concelho: "Santarém", freguesia: "Alvalade", tipologia: "Apartamento", estado: "Usado", p25: 1800, media: 2000, p75: 2200, n: 8 },
  ];

  const match = app.context.getSirPriceMatch();
  assert.equal(match.level, "freguesia");
  assert.equal(match.low, 1800);
  assert.equal(match.high, 2200);
});

test("não transforma percentis SIR vazios em zero", () => {
  const app = loadApplication();

  assert.equal(app.context.toSirNumber(""), null);
  assert.equal(app.context.toSirNumber("2034"), 2034);
  assert.equal(app.context.toSirNumber(null), null);
});

test("usa o INE total para moradia e faz fallback regional para apartamento", () => {
  const app = loadApplication();
  app.element("#locality").value = "Santarém";
  app.element("#propertyType").value = "house";
  app.context.window.ineDataState.loaded = true;
  app.context.window.ineDataState.totalRows = [
    { location: "Santarém", category: "Total", geocode: "1D31416", value: 1391, period: "4.º Trimestre de 2025" },
  ];
  app.context.window.ineDataState.apartmentRows = [
    { location: "Médio Tejo", category: "Apartamentos", geocode: "16I", value: 1021, period: "4.º Trimestre de 2023" },
  ];

  const houseMatch = app.context.getInePriceMatch();
  assert.equal(houseMatch.level, "localização");
  assert.equal(houseMatch.mean, 1391);

  app.element("#propertyType").value = "apartment";
  const apartmentMatch = app.context.getInePriceMatch();
  assert.equal(apartmentMatch.level, "região");
  assert.equal(apartmentMatch.label, "Médio Tejo");
  assert.equal(apartmentMatch.mean, 1021);
  assert.equal(apartmentMatch.fallback, true);
});

test("separa o preço recomendado do preço de entrada com margem de negociação", () => {
  const app = loadApplication();
  fillRequiredFields(app);
  app.element("#negotiationMargin").value = "5,3";

  const valuation = app.context.getValuation();

  assert.equal(valuation.recommendedSaleValue, 100000);
  assert.equal(valuation.negotiationMarginPercent, 5.3);
  assert.equal(valuation.listingPriceValue, 106000);

  app.element("#negotiationMargin").value = "0";
  const noMarginValuation = app.context.getValuation();
  assert.equal(noMarginValuation.negotiationMarginPercent, 0);
  assert.equal(noMarginValuation.listingPriceValue, 100000);
});

test("ao alterar P25 e P75, usa a média manual no preço central e mantém a média SIR", () => {
  const app = loadApplication();
  fillRequiredFields(app);
  app.element("#locality").value = "Santarém";
  app.element("#pricePerSqmLow").value = "2000";
  app.element("#pricePerSqmHigh").value = "2400";
  app.context.window.sirDataState.loaded = true;
  app.context.window.sirDataState.lastMatch = { mean: 1525 };
  app.context.window.setSirPriceManuallyEdited(true);

  const valuation = app.context.getValuation();

  assert.equal(valuation.sirPriceMean, 1525);
  assert.equal(valuation.pricePerSqmInputMean, 2200);
  assert.equal(valuation.pricePerSqmReference, 2200);
  assert.equal(valuation.pricePerSqmReferenceSource, "manual");
});
