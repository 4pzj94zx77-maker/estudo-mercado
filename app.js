const DEPENDENT_LOW_WEIGHT = 0.25;
const DEPENDENT_HIGH_WEIGHT = 1 / 3;

const LAND_REFERENCES = {
  none: {
    label: "Sem referência selecionada",
    low: 0,
    high: 0,
    display: "0 €/m²",
  },
  rustic: {
    label: "Terreno rústico sem potencial de construção",
    low: 1,
    high: 2,
    display: "1 € a 2 €/m²",
  },
  rural_low: {
    label: "Interior rural ou baixa procura",
    low: 15,
    high: 40,
    display: "15 € a 40 €/m²",
  },
  rural_medium: {
    label: "Interior com procura razoável / periferias urbanas",
    low: 40,
    high: 100,
    display: "40 € a 100 €/m²",
  },
  medium_city: {
    label: "Cidades médias e zonas próximas de centros urbanos",
    low: 80,
    high: 200,
    display: "80 € a 200 €/m²",
  },
  lisbon_porto_coast: {
    label: "Grande Lisboa, Grande Porto, litoral valorizado",
    low: 200,
    high: 500,
    display: "200 € a 500 €/m²",
  },
  premium_height: {
    label: "Zonas premium ou com potencial de construção em altura",
    low: 500,
    high: 1000,
    display: "500 € a mais de 1.000 €/m²",
  },
};

const form = document.querySelector("#valuationForm");
const fields = {
  clientName: document.querySelector("#clientName"),
  street: document.querySelector("#street"),
  locality: document.querySelector("#locality"),
  propertyType: document.querySelector("#propertyType"),
  condition: document.querySelector("#condition"),
  privateArea: document.querySelector("#privateArea"),
  dependentArea: document.querySelector("#dependentArea"),
  landArea: document.querySelector("#landArea"),
  landType: document.querySelector("#landType"),
  landReference: document.querySelector("#landReference"),
  buildableArea: document.querySelector("#buildableArea"),
  pricePerSqmLow: document.querySelector("#pricePerSqmLow"),
  pricePerSqmHigh: document.querySelector("#pricePerSqmHigh"),
};

const output = {
  resultClient: document.querySelector("#resultClient"),
  resultLocation: document.querySelector("#resultLocation"),
  fastSaleValue: document.querySelector("#fastSaleValue"),
  correctSaleValue: document.querySelector("#correctSaleValue"),
  marketLimitValue: document.querySelector("#marketLimitValue"),
  recommendedSaleValue: document.querySelector("#recommendedSaleValue"),
  weightedArea: document.querySelector("#weightedArea"),
  zonePrice: document.querySelector("#zonePrice"),
  potentialCost: document.querySelector("#potentialCost"),
  builtCost: document.querySelector("#builtCost"),
  privateValue: document.querySelector("#privateValue"),
  dependentValue: document.querySelector("#dependentValue"),
  landValue: document.querySelector("#landValue"),
  valuationNote: document.querySelector("#valuationNote"),
  detailPrivateArea: document.querySelector("#detailPrivateArea"),
  detailDependentArea: document.querySelector("#detailDependentArea"),
  detailWeightedArea: document.querySelector("#detailWeightedArea"),
  detailBaseValue: document.querySelector("#detailBaseValue"),
};

const pdfButton = document.querySelector("#pdfButton");
const cadernetaUpload = {
  input: document.querySelector("#cadernetaFile"),
  status: document.querySelector("#cadernetaStatus"),
  summary: document.querySelector("#cadernetaSummary"),
  filledFields: document.querySelector("#cadernetaFilledFields"),
};

const printOutput = {
  client: document.querySelector("#printClient"),
  location: document.querySelector("#printLocation"),
  fastSaleValue: document.querySelector("#printFastSaleValue"),
  correctSaleValue: document.querySelector("#printCorrectSaleValue"),
  marketLimitValue: document.querySelector("#printMarketLimitValue"),
  recommendedSaleValue: document.querySelector("#printRecommendedSaleValue"),
  privateArea: document.querySelector("#printPrivateArea"),
  dependentArea: document.querySelector("#printDependentArea"),
  landArea: document.querySelector("#printLandArea"),
  zonePrice: document.querySelector("#printZonePrice"),
  condition: document.querySelector("#printCondition"),
  propertyType: document.querySelector("#printPropertyType"),
  landType: document.querySelector("#printLandType"),
  landReference: document.querySelector("#printLandReference"),
  buildableArea: document.querySelector("#printBuildableArea"),
  potentialCost: document.querySelector("#printPotentialCost"),
  builtCost: document.querySelector("#printBuiltCost"),
  weightedArea: document.querySelector("#printWeightedArea"),
  privateValue: document.querySelector("#printPrivateValue"),
  dependentValue: document.querySelector("#printDependentValue"),
  landValue: document.querySelector("#printLandValue"),
  landRate: document.querySelector("#printLandRate"),
  conditionUplift: document.querySelector("#printConditionUplift"),
  note: document.querySelector("#printNote"),
  detailPrivateArea: document.querySelector("#printDetailPrivateArea"),
  detailDependentArea: document.querySelector("#printDetailDependentArea"),
  detailWeightedArea: document.querySelector("#printDetailWeightedArea"),
  detailBaseValue: document.querySelector("#printDetailBaseValue"),
};

const currencyFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const areaFormatter = new Intl.NumberFormat("pt-PT", {
  maximumFractionDigits: 1,
});

function parseNumber(value) {
  if (!value) return 0;
  const normalized = value
    .toString()
    .trim()
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeForExtraction(value) {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[²ºª]/g, "2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanExtractedText(value) {
  return value
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:])/g, "$1")
    .trim();
}

function toDisplayText(value) {
  const cleaned = cleanExtractedText(value);
  if (!cleaned || /[a-záàâãéèêíìóòôõúùç]/.test(cleaned)) return cleaned;

  return cleaned
    .toLowerCase()
    .replace(/\b([\p{L}])/gu, (letter) => letter.toUpperCase())
    .replace(/\b(De|Da|Do|Das|Dos|E)\b/g, (word) => word.toLowerCase());
}

function formatInputNumber(value) {
  return areaFormatter.format(value || 0);
}

function extractArea(normalizedText, labels) {
  for (const label of labels) {
    const normalizedLabel = escapeRegExp(normalizeForExtraction(label));
    const pattern = new RegExp(`${normalizedLabel}\\s*[:\\-]?\\s*([0-9][0-9\\s.]*[,]?\\d*)\\s*(?:m2|m\\s*2)?`, "i");
    const match = normalizedText.match(pattern);

    if (match) {
      const value = parseNumber(match[1]);
      if (value) return value;
    }
  }

  return 0;
}

function getValueFromLabel(lines, labels) {
  for (let index = 0; index < lines.length; index += 1) {
    const line = cleanExtractedText(lines[index]);
    const normalizedLine = normalizeForExtraction(line);

    for (const label of labels) {
      const normalizedLabel = normalizeForExtraction(label);
      if (!normalizedLine.includes(normalizedLabel)) continue;

      const afterLabel = line
        .replace(new RegExp(`.*?${escapeRegExp(label)}\\s*[:\\-]?`, "i"), "")
        .trim();

      if (afterLabel && normalizeForExtraction(afterLabel) !== normalizedLine) return toDisplayText(afterLabel);

      for (let nextIndex = index + 1; nextIndex < Math.min(index + 5, lines.length); nextIndex += 1) {
        const nextLine = cleanExtractedText(lines[nextIndex]);
        const normalizedNextLine = normalizeForExtraction(nextLine);
        const looksLikeLabel = /^(artigo|distrito|concelho|freguesia|titular|area|afectacao|afetação|valor|matriz)\b/.test(
          normalizedNextLine,
        );

        if (nextLine && !looksLikeLabel) return toDisplayText(nextLine);
      }
    }
  }

  return "";
}

function isExtractionLabel(line) {
  const normalizedLine = normalizeForExtraction(line);
  return /^(artigo|distrito|concelho|freguesia|titular|area|afectacao|afetacao|valor|matriz|codigo postal|descricao|tipo de predio|servico de financas)\b/.test(
    normalizedLine,
  );
}

function stripKnownAddressLabel(line) {
  const labels = ["Localização do prédio", "Localizacao do predio", "Localização", "Localizacao", "Morada", "Sito em"];
  let cleaned = cleanExtractedText(line);

  for (const label of labels) {
    const normalizedLabel = normalizeForExtraction(label);
    const normalizedLine = normalizeForExtraction(cleaned);
    if (!normalizedLine.includes(normalizedLabel)) continue;
    if (normalizedLine === normalizedLabel) return "";

    const pattern = new RegExp(`.*?${escapeRegExp(label)}\\s*[:\\-]?`, "i");
    const stripped = cleaned.replace(pattern, "").trim();
    if (stripped && normalizeForExtraction(stripped) !== normalizedLine) return stripped;
    if (normalizedLine.startsWith(normalizedLabel)) return "";

    const [, afterColon] = cleaned.split(/[:;-]/);
    if (afterColon) return afterColon.trim();
  }

  return cleaned;
}

function looksLikeAddressLine(line) {
  const normalizedLine = normalizeForExtraction(line);
  const streetPrefixes = /^(rua|avenida|av\.|estrada|travessa|largo|praceta|praca|beco|caminho|quinta|urbanizacao|rotunda|bairro|loteamento|sitio|casal)\b/;
  const numberHints = /\b(n\.?|n2|numero|lote|porta|andar|fracao|fraccao|fracção|dto|direito|esq|esquerdo|r\/c|rc|cave)\b/;

  return streetPrefixes.test(normalizedLine) || numberHints.test(normalizedLine) || /^\d+[a-z]?\b/.test(normalizedLine);
}

function composeAddress(parts) {
  return toDisplayText(
    parts
      .map(cleanExtractedText)
      .filter(Boolean)
      .join(", ")
      .replace(/\s*,\s*/g, ", "),
  );
}

function extractAddress(lines) {
  const addressLabels = ["Localização do prédio", "Localizacao do predio", "Localização", "Localizacao", "Morada", "Sito em"];
  const labelIndex = lines.findIndex((line) => {
    const normalizedLine = normalizeForExtraction(line);
    return addressLabels.some((label) => normalizedLine.includes(normalizeForExtraction(label)));
  });

  if (labelIndex >= 0) {
    const parts = [];
    const inlineAddress = stripKnownAddressLabel(lines[labelIndex]);

    if (inlineAddress && !isExtractionLabel(inlineAddress)) {
      parts.push(inlineAddress);
    }

    for (let index = labelIndex + 1; index < Math.min(labelIndex + 7, lines.length); index += 1) {
      const line = cleanExtractedText(lines[index]);
      if (!line || isExtractionLabel(line)) break;

      if (!parts.length || looksLikeAddressLine(line)) {
        parts.push(line);
        continue;
      }

      break;
    }

    if (parts.length) return composeAddress(parts);
  }

  const streetPrefixes = /^(rua|avenida|av\.|estrada|travessa|largo|praceta|praça|praca|beco|caminho|quinta)\b/i;
  const streetIndex = lines.findIndex((line) => streetPrefixes.test(cleanExtractedText(line)));

  if (streetIndex >= 0) {
    const parts = [lines[streetIndex]];
    const nextLine = lines[streetIndex + 1];
    if (nextLine && looksLikeAddressLine(nextLine) && !isExtractionLabel(nextLine)) parts.push(nextLine);
    return composeAddress(parts);
  }

  return "";
}

function extractLocality(lines) {
  const council = getValueFromLabel(lines, ["Concelho"]);
  if (council) return council;

  const parish = getValueFromLabel(lines, ["Freguesia"]);
  return parish || "";
}

function extractPostalCode(text) {
  const match = text.match(/\b(\d{4})[-\s]?(\d{3})\b/);
  return match ? `${match[1]}-${match[2]}` : "";
}

function addPostalCodeToAddress(address, postalCode) {
  if (!address || !postalCode) return address;
  if (address.includes(postalCode)) return address;
  return composeAddress([address, postalCode]);
}

function extractPropertyType(normalizedText) {
  if (
    normalizedText.includes("fracao autonoma") ||
    normalizedText.includes("fraccao autonoma") ||
    normalizedText.includes("propriedade horizontal") ||
    normalizedText.includes("apartamento")
  ) {
    return "apartment";
  }

  if (
    normalizedText.includes("moradia") ||
    normalizedText.includes("habitacao unifamiliar") ||
    normalizedText.includes("habitação unifamiliar") ||
    normalizedText.includes("predio em propriedade total")
  ) {
    return "house";
  }

  return "";
}

function parseCadernetaText(text) {
  const lines = text
    .split(/\n+/)
    .map(cleanExtractedText)
    .filter(Boolean);
  const normalizedText = normalizeForExtraction(text);
  const street = extractAddress(lines);
  const postalCode = extractPostalCode(text);

  return {
    street: addPostalCodeToAddress(street, postalCode),
    locality: extractLocality(lines),
    propertyType: extractPropertyType(normalizedText),
    privateArea: extractArea(normalizedText, ["Área bruta privativa", "Area bruta privativa"]),
    dependentArea: extractArea(normalizedText, ["Área bruta dependente", "Area bruta dependente", "Área dependente", "Area dependente"]),
    landArea: extractArea(normalizedText, ["Área total do terreno", "Area total do terreno", "Área do terreno", "Area do terreno"]),
    landType: normalizedText.includes("predio rustico") || normalizedText.includes("prédio rústico") ? "rustic" : "",
  };
}

function formatCurrency(value) {
  return currencyFormatter.format(Math.round(value || 0));
}

function formatCurrencyRange(low, high) {
  if (Math.round(low || 0) === Math.round(high || 0)) return formatCurrency(low);
  return `${formatCurrency(low)} - ${formatCurrency(high)}`;
}

function formatArea(value) {
  return `${areaFormatter.format(value || 0)} m²`;
}

function getConditionLabel(condition) {
  if (condition === "new") return "Novo";
  if (condition === "renovated") return "Remodelado";
  return "Usado";
}

function getPropertyTypeLabel(propertyType) {
  if (propertyType === "apartment") return "Apartamento";
  if (propertyType === "house") return "Moradia";
  return "Por preencher";
}

function getConditionUpliftRange(condition) {
  if (condition === "renovated") return { low: 0.05, high: 0.2 };
  if (condition === "new") return { low: 0.05, high: 0.1 };
  return { low: 0, high: 0 };
}

function getLandTypeLabel(landType) {
  if (!landType) return "Sem terreno selecionado";
  return landType === "rustic" ? "Terreno rústico" : "Terreno urbano";
}

function getLandReference(landType, landReference) {
  if (!landType || !landReference) return LAND_REFERENCES.none;
  return landType === "rustic" ? LAND_REFERENCES.rustic : LAND_REFERENCES[landReference];
}

function formatRateRange(low, high) {
  if (Math.round(low || 0) === Math.round(high || 0)) return `${formatCurrency(low).replace(/\s?€/, "")} €/m²`;
  return `${formatCurrency(low).replace(/\s?€/, "")} € a ${formatCurrency(high).replace(/\s?€/, "")} €/m²`;
}

function normalizePriceRange(lowInput, highInput) {
  const low = parseNumber(lowInput);
  const high = parseNumber(highInput);

  if (low && high) {
    return {
      low: Math.min(low, high),
      high: Math.max(low, high),
    };
  }

  const singleValue = low || high || 0;
  return {
    low: singleValue,
    high: singleValue,
  };
}

function roundUpToThousand(value) {
  return value > 0 ? Math.ceil(value / 1000) * 1000 : 0;
}

function formatPotentialCost(lowValue, highValue, buildableArea, landType) {
  if (!landType) return "Sem terreno selecionado";
  if (landType === "rustic") return "Sem potencial de construção";
  if (!buildableArea) return "Sem área indicada";
  return `${formatRateRange(lowValue / buildableArea, highValue / buildableArea)} construção`;
}

function formatBuiltCost(lowValue, highValue, weightedLowArea, weightedHighArea) {
  if (!weightedLowArea || !weightedHighArea) return "Sem área indicada";
  return `${formatRateRange(lowValue / weightedLowArea, highValue / weightedHighArea)} ponderado`;
}

function updateLandReferenceState(landType) {
  const isRustic = landType === "rustic";
  const hasNoLand = !landType;
  fields.landArea.disabled = hasNoLand;
  fields.landReference.disabled = hasNoLand || isRustic;
  fields.buildableArea.disabled = hasNoLand || isRustic;

  if (hasNoLand) {
    fields.landArea.value = "0";
    fields.landReference.value = "";
    fields.buildableArea.value = "0";
  }

  if (isRustic) {
    fields.buildableArea.value = "0";
  }
}

function getValuationNote(valuation) {
  const baseNote = "Estimativa indicativa: área dependente calculada entre 1/4 e 1/3 do preço da área bruta privativa.";
  const landNote = !valuation.landType
    ? "Sem terreno associado ao cálculo."
    : valuation.landType === "rustic"
    ? "Terreno rústico sem potencial de construção calculado entre 1 € e 2 €/m²."
    : `Terreno urbano calculado pela referência "${valuation.landReferenceLabel}", entre ${valuation.landRateDisplay}.`;
  const potentialNote = !valuation.landType
    ? "Sem cálculo de construção potencial."
    : valuation.landType === "rustic"
    ? "Sem cálculo de construção potencial para terreno rústico."
    : valuation.buildableArea
    ? `Custo por m² de construção potencial = valor do terreno dividido por ${formatArea(valuation.buildableArea)} de construção permitida.`
    : "Para calcular o custo por m² de construção potencial, indica a área bruta de construção permitida.";

  if (valuation.condition === "renovated") {
    return `${baseNote} ${landNote} ${potentialNote} O intervalo final inclui uma valorização de remodelação entre 5% e 20%.`;
  }
  if (valuation.condition === "new") {
    return `${baseNote} ${landNote} ${potentialNote} O intervalo final inclui uma valorização entre 5% e 10%.`;
  }
  return `${baseNote} ${landNote} ${potentialNote}`;
}

function getResultNote(valuation) {
  const baseNote = "Estimativa indicativa: área dependente calculada a 25% da área bruta privativa para efeitos de ponderação.";
  const potentialNote = !valuation.landType
    ? "Sem terreno associado ao cálculo."
    : valuation.buildableArea
    ? "O custo de construção potencial usa o valor estimado do terreno dividido pela construção permitida."
    : "Se existir construção permitida no terreno, podes indicá-la para obter o custo por m² de construção potencial.";

  if (valuation.condition === "new" || valuation.condition === "renovated") {
    return `${baseNote} ${potentialNote} O intervalo final inclui a valorização aplicável aos dados escolhidos.`;
  }
  return `${baseNote} ${potentialNote}`;
}

function setUploadStatus(message, type = "") {
  if (!cadernetaUpload.status) return;

  cadernetaUpload.status.textContent = message;
  cadernetaUpload.status.classList.toggle("is-success", type === "success");
  cadernetaUpload.status.classList.toggle("is-error", type === "error");
}

function resetCadernetaSummary() {
  if (cadernetaUpload.summary) cadernetaUpload.summary.hidden = true;
  if (cadernetaUpload.filledFields) cadernetaUpload.filledFields.textContent = "-";
  setUploadStatus("Seleciona um PDF para preencher morada e áreas automaticamente.");
}

async function ensurePdfReader() {
  if (!window.pdfjsLib) {
    window.pdfjsLib = await import("./assets/pdfjs/pdf.min.mjs");
  }

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/pdfjs/pdf.worker.min.mjs";
  return window.pdfjsLib;
}

async function readPdfText(file) {
  const pdfjsLib = await ensurePdfReader();
  if (!pdfjsLib) {
    throw new Error("Leitor de PDF indisponível.");
  }

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => item.str)
      .filter(Boolean)
      .join("\n");

    pages.push(pageText);
  }

  return pages.join("\n");
}

function applyCadernetaData(data) {
  const filled = [];

  if (data.street) {
    fields.street.value = data.street;
    filled.push("morada");
  }

  if (data.locality) {
    fields.locality.value = data.locality;
    filled.push("localidade");
  }

  if (data.propertyType) {
    fields.propertyType.value = data.propertyType;
    filled.push("tipo de imóvel");
  }

  if (data.privateArea) {
    fields.privateArea.value = formatInputNumber(data.privateArea);
    filled.push("área bruta privativa");
  }

  if (data.dependentArea) {
    fields.dependentArea.value = formatInputNumber(data.dependentArea);
    filled.push("área dependente");
  }

  if (data.landArea) {
    fields.landType.value = data.landType || "urban";
    updateLandReferenceState(fields.landType.value);
    fields.landArea.value = formatInputNumber(data.landArea);
    filled.push("área do terreno");
  } else if (data.landType) {
    fields.landType.value = data.landType;
    updateLandReferenceState(fields.landType.value);
    filled.push("tipo de terreno");
  }

  render();
  return filled;
}

async function handleCadernetaUpload(event) {
  const [file] = event.target.files;
  if (!file) {
    resetCadernetaSummary();
    return;
  }

  if (file.type && file.type !== "application/pdf") {
    setUploadStatus("Seleciona uma caderneta predial em PDF.", "error");
    return;
  }

  setUploadStatus("A ler a caderneta predial...");

  try {
    const text = await readPdfText(file);
    const extractedData = parseCadernetaText(text);
    const filled = applyCadernetaData(extractedData);

    if (!filled.length) {
      setUploadStatus("Não consegui identificar campos automaticamente. Podes preencher os dados manualmente.", "error");
      if (cadernetaUpload.summary) cadernetaUpload.summary.hidden = true;
      return;
    }

    if (cadernetaUpload.summary) cadernetaUpload.summary.hidden = false;
    if (cadernetaUpload.filledFields) cadernetaUpload.filledFields.textContent = filled.join(", ");
    setUploadStatus("Caderneta lida. Confirma os campos preenchidos antes de exportar o PDF.", "success");
  } catch (error) {
    setUploadStatus("Não foi possível ler este PDF. Se for uma digitalização, preenche os campos manualmente.", "error");
  }
}

function getValuation() {
  const propertyType = fields.propertyType.value;
  const condition = fields.condition.value;
  const landType = fields.landType.value;
  const landReferenceKey = fields.landReference.value;
  const selectedLandReference = getLandReference(landType, landReferenceKey);
  const privateArea = parseNumber(fields.privateArea.value);
  const dependentArea = parseNumber(fields.dependentArea.value);
  const landArea = landType ? parseNumber(fields.landArea.value) : 0;
  const buildableArea = landType === "urban" ? parseNumber(fields.buildableArea.value) : 0;
  const priceRange = normalizePriceRange(fields.pricePerSqmLow.value, fields.pricePerSqmHigh.value);
  const pricePerSqmLow = priceRange.low;
  const pricePerSqmHigh = priceRange.high;
  const pricePerSqmReference = (pricePerSqmLow + pricePerSqmHigh) / 2;

  const privateLowValue = privateArea * pricePerSqmLow;
  const privateHighValue = privateArea * pricePerSqmHigh;
  const privateValue = (privateLowValue + privateHighValue) / 2;
  const dependentLowValue = dependentArea * pricePerSqmLow * DEPENDENT_LOW_WEIGHT;
  const dependentHighValue = dependentArea * pricePerSqmHigh * DEPENDENT_HIGH_WEIGHT;
  const landLowValue = landArea * selectedLandReference.low;
  const landHighValue = landArea * selectedLandReference.high;
  const dependentWeightedArea = dependentArea * DEPENDENT_LOW_WEIGHT;
  const detailedWeightedArea = privateArea + dependentWeightedArea;
  const detailedBaseLowValue = detailedWeightedArea * pricePerSqmLow;
  const detailedBaseHighValue = detailedWeightedArea * pricePerSqmHigh;
  const detailedBaseValue = (detailedBaseLowValue + detailedBaseHighValue) / 2;
  const baseLowValue = privateLowValue + dependentLowValue + landLowValue;
  const baseHighValue = privateHighValue + dependentHighValue + landHighValue;
  const conditionUpliftRange = getConditionUpliftRange(condition);
  const conditionUpliftLow = baseLowValue * conditionUpliftRange.low;
  const conditionUpliftHigh = baseHighValue * conditionUpliftRange.high;
  const lowValue = baseLowValue + conditionUpliftLow;
  const highValue = baseHighValue + conditionUpliftHigh;
  const referenceValue = (lowValue + highValue) / 2;
  const recommendedSaleValue = roundUpToThousand(referenceValue);
  const weightedLandLowArea = pricePerSqmLow ? landLowValue / pricePerSqmLow : 0;
  const weightedLandHighArea = pricePerSqmHigh ? landHighValue / pricePerSqmHigh : 0;
  const weightedLowArea = privateArea + dependentArea * DEPENDENT_LOW_WEIGHT + weightedLandLowArea;
  const weightedHighArea = privateArea + dependentArea * DEPENDENT_HIGH_WEIGHT + weightedLandHighArea;

  return {
    clientName: fields.clientName.value.trim(),
    street: fields.street.value.trim(),
    locality: fields.locality.value.trim(),
    propertyType,
    propertyTypeLabel: getPropertyTypeLabel(propertyType),
    condition,
    conditionLabel: getConditionLabel(condition),
    landType,
    landTypeLabel: getLandTypeLabel(landType),
    landReferenceLabel: selectedLandReference.label,
    landRateDisplay: selectedLandReference.display,
    landRateLow: selectedLandReference.low,
    landRateHigh: selectedLandReference.high,
    privateArea,
    dependentArea,
    dependentWeightedArea,
    detailedWeightedArea,
    detailedBaseValue,
    detailedBaseLowValue,
    detailedBaseHighValue,
    landArea,
    buildableArea,
    pricePerSqmLow,
    pricePerSqmHigh,
    pricePerSqmReference,
    privateLowValue,
    privateHighValue,
    privateValue,
    dependentLowValue,
    dependentHighValue,
    landLowValue,
    landHighValue,
    conditionUpliftLow,
    conditionUpliftHigh,
    lowValue,
    highValue,
    referenceValue,
    recommendedSaleValue,
    weightedLowArea,
    weightedHighArea,
  };
}

function render() {
  const valuation = getValuation();
  updateLandReferenceState(valuation.landType);
  const locationParts = [valuation.street, valuation.locality].filter(Boolean);
  const client = valuation.clientName || "Por preencher";
  const location = locationParts.length ? locationParts.join(", ") : "Morada por preencher";
  const weightedArea = `${formatArea(valuation.weightedLowArea)} - ${formatArea(valuation.weightedHighArea)}`;
  const zonePrice = formatRateRange(valuation.pricePerSqmLow, valuation.pricePerSqmHigh);
  const dependentValue = `${formatCurrency(valuation.dependentLowValue)} - ${formatCurrency(valuation.dependentHighValue)}`;
  const landValue = `${formatCurrency(valuation.landLowValue)} - ${formatCurrency(valuation.landHighValue)}`;
  const landRate = valuation.landRateDisplay;
  const buildableAreaLabel = valuation.landType === "rustic" ? "Sem potencial" : formatArea(valuation.buildableArea);
  const potentialCost = formatPotentialCost(valuation.landLowValue, valuation.landHighValue, valuation.buildableArea, valuation.landType);
  const builtCost = formatBuiltCost(valuation.lowValue, valuation.highValue, valuation.weightedLowArea, valuation.weightedHighArea);
  const detailPrivateArea = formatArea(valuation.privateArea);
  const detailDependentArea = `${formatArea(valuation.dependentArea)} x 0,25 = ${formatArea(valuation.dependentWeightedArea)}`;
  const detailWeightedArea = `${formatArea(valuation.privateArea)} + ${formatArea(valuation.dependentWeightedArea)} = ${formatArea(valuation.detailedWeightedArea)}`;
  const detailBaseValue = `${formatArea(valuation.detailedWeightedArea)} x ${zonePrice} = ${formatCurrencyRange(valuation.detailedBaseLowValue, valuation.detailedBaseHighValue)}`;
  const conditionUplift = valuation.conditionUpliftHigh
    ? `${formatCurrency(valuation.conditionUpliftLow)} - ${formatCurrency(valuation.conditionUpliftHigh)}`
    : formatCurrency(0);
  const resultNote = getResultNote(valuation);
  const printNote = getValuationNote(valuation);

  output.resultClient.textContent = valuation.clientName ? `Cliente: ${valuation.clientName}` : "Cliente por preencher";
  output.resultLocation.textContent = location;
  output.fastSaleValue.textContent = formatCurrency(valuation.lowValue);
  output.correctSaleValue.textContent = formatCurrency(valuation.referenceValue);
  output.marketLimitValue.textContent = formatCurrency(valuation.highValue);
  output.recommendedSaleValue.textContent = formatCurrency(valuation.recommendedSaleValue);
  output.weightedArea.textContent = weightedArea;
  output.zonePrice.textContent = zonePrice;
  output.potentialCost.textContent = potentialCost;
  output.builtCost.textContent = builtCost;
  output.privateValue.textContent = formatCurrencyRange(valuation.privateLowValue, valuation.privateHighValue);
  output.dependentValue.textContent = dependentValue;
  output.landValue.textContent = landValue;
  output.valuationNote.textContent = resultNote;
  output.detailPrivateArea.textContent = detailPrivateArea;
  output.detailDependentArea.textContent = detailDependentArea;
  output.detailWeightedArea.textContent = detailWeightedArea;
  output.detailBaseValue.textContent = detailBaseValue;

  printOutput.client.textContent = client;
  printOutput.location.textContent = location;
  printOutput.fastSaleValue.textContent = formatCurrency(valuation.lowValue);
  printOutput.correctSaleValue.textContent = formatCurrency(valuation.referenceValue);
  printOutput.marketLimitValue.textContent = formatCurrency(valuation.highValue);
  printOutput.recommendedSaleValue.textContent = formatCurrency(valuation.recommendedSaleValue);
  printOutput.privateArea.textContent = formatArea(valuation.privateArea);
  printOutput.dependentArea.textContent = formatArea(valuation.dependentArea);
  printOutput.landArea.textContent = formatArea(valuation.landArea);
  printOutput.zonePrice.textContent = zonePrice;
  printOutput.condition.textContent = valuation.conditionLabel;
  printOutput.propertyType.textContent = valuation.propertyTypeLabel;
  printOutput.landType.textContent = valuation.landTypeLabel;
  printOutput.landReference.textContent = valuation.landReferenceLabel;
  printOutput.buildableArea.textContent = buildableAreaLabel;
  printOutput.potentialCost.textContent = potentialCost;
  printOutput.builtCost.textContent = builtCost;
  printOutput.weightedArea.textContent = weightedArea;
  printOutput.privateValue.textContent = formatCurrencyRange(valuation.privateLowValue, valuation.privateHighValue);
  printOutput.dependentValue.textContent = dependentValue;
  printOutput.landValue.textContent = landValue;
  printOutput.landRate.textContent = landRate;
  printOutput.conditionUplift.textContent = conditionUplift;
  printOutput.note.textContent = printNote;
  printOutput.detailPrivateArea.textContent = detailPrivateArea;
  printOutput.detailDependentArea.textContent = detailDependentArea;
  printOutput.detailWeightedArea.textContent = detailWeightedArea;
  printOutput.detailBaseValue.textContent = detailBaseValue;
}

form.addEventListener("input", render);
form.addEventListener("change", render);
form.addEventListener("reset", () => {
  window.setTimeout(() => {
    resetCadernetaSummary();
    render();
  }, 0);
});

if (cadernetaUpload.input) {
  cadernetaUpload.input.addEventListener("change", handleCadernetaUpload);
}

pdfButton.addEventListener("click", () => {
  render();
  window.print();
});

render();
