// Tipos de los payloads del API que consume el frontend. Espejo manual del
// backend (Prisma + serializadores): si el backend renombra un campo, el
// compilador lo detecta aquí en vez de fallar en producción.
import { RepairStatus } from './status';

export type PaymentStatus = 'NOT_REQUIRED' | 'PENDING' | 'PROOF_RECEIVED' | 'VALIDATED' | 'REJECTED' | 'CANCELLED';
export type ProofStatus = 'PENDING' | 'VALIDATED' | 'REJECTED';
export type PaymentMethod = 'TRANSFER' | 'DEPOSIT' | 'CASH';

export interface Customer {
  name: string;
  email: string | null;
  phone: string | null;
}

export interface PaymentProof {
  id: string;
  status: ProofStatus;
  originalFilename: string;
  uploadedAt: string;
  rejectionReason: string | null;
}

export interface PaymentRequest {
  id: string;
  status: PaymentStatus;
  amount: string; // Decimal serializado
  concept: string | null;
  allowedMethods: PaymentMethod[];
  proofs: PaymentProof[];
}

export interface RepairHistoryEntry {
  id: string;
  action: string;
  createdAt: string;
  fromStatus: RepairStatus | null;
  toStatus: RepairStatus | null;
  publicNote: string | null;
  internalNote: string | null;
  actorType: 'INTERNAL_USER' | 'PUBLIC_CLIENT' | 'SYSTEM';
  actorUser: { name: string } | null;
}

// GET /repairs/:id (admin). Incluye customer, paymentRequests+proofs e history.
export interface AdminRepair {
  id: string;
  folio: string;
  status: RepairStatus;
  paymentStatus: PaymentStatus;
  requiresPayment: boolean;
  deviceType: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  deviceSerialNumber: string | null;
  deviceColor: string | null;
  receivedAccessories: string | null;
  physicalCondition: string | null;
  reportedIssue: string;
  diagnosis: string | null;
  requiredActions: string | null;
  estimatedCost: string | null;
  customerVisibleNotes: string | null;
  internalNotes: string | null;
  receivedAt: string;
  createdAt: string;
  customer: Customer;
  assignedTechnician: { name: string } | null;
  paymentRequests: PaymentRequest[];
  history: RepairHistoryEntry[];
}

// POST /public/repairs/lookup — vista pública serializada.
export interface PublicPaymentInstructions {
  beneficiaryName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  clabe: string | null;
  cardNumber: string | null;
  concept: string | null;
  transferInstructions: string | null;
  depositInstructions: string | null;
  cashPaymentInstructions: string | null;
  additionalNotes: string | null;
}

export interface PublicPayment {
  status: PaymentStatus;
  statusLabel: string;
  amount: string | null;
  concept: string | null;
  allowedMethods: PaymentMethod[];
  instructions: PublicPaymentInstructions | null;
  proofSubmitted: { status: ProofStatus; uploadedAt: string; rejectionReason: string | null } | null;
  paymentRequestId: string | null;
}

export interface PublicRepair {
  folio: string;
  status: RepairStatus;
  statusLabel: string;
  statusMessage: string;
  customerName: string;
  device: { type: string; brand: string | null; model: string | null; color: string | null };
  reportedIssue: string;
  receivedAt: string;
  diagnosis: string | null;
  requiredActions: string | null;
  visibleNotes: string | null;
  payment: PublicPayment | null;
  canUploadProof: boolean;
  visitedStatuses: RepairStatus[];
  history: { date: string; action: string; note: string | null; statusLabel: string | null }[];
}

// GET /dashboard
export interface DashboardCounts {
  pendingValidation: number;
  newProofs: number;
  waitingReview: number;
  readyForPickup: number;
  unread: number;
}

// GET /payment-proofs?status=PENDING
export interface PendingProof {
  id: string;
  repairId: string;
  uploadedAt: string;
  repair: { folio: string; customer: { name: string } };
  paymentRequest: { id: string; amount: string };
}
