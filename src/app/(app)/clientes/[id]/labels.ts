import type { DocumentType, PartyRole } from "@/db/schema";

export const DOCUMENT_LABEL: Record<DocumentType, string> = {
  BILHETE_IDENTIDADE: "Bilhete de Identidade",
  PASSAPORTE: "Passaporte",
  NIF: "Comprovativo de NIF",
  COMPROVATIVO_MORADA: "Comprovativo de morada",
  CERTIDAO_COMERCIAL: "Certidão comercial",
  ESTATUTOS: "Estatutos / pacto social",
  COMPROVATIVO_RENDIMENTOS: "Comprovativo de rendimentos",
  OUTRO: "Outro",
};

export const PARTY_ROLE_LABEL: Record<PartyRole, string> = {
  SOCIO: "Sócio / acionista",
  ADMINISTRADOR: "Administrador / gerente",
  BENEFICIARIO_EFETIVO: "Beneficiário efetivo",
  REPRESENTANTE_LEGAL: "Representante legal",
};
