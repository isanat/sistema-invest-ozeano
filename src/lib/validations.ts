import { z } from 'zod/v4';

// ============ Auth Schemas ============

export const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

// ============ Deposit Schemas ============

export const depositSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  method: z.enum(['pix', 'usdt_trc20', 'usdt_polygon']),
  txHash: z.string().optional(),
  network: z.string().optional(),
});

// ============ Withdrawal Schemas ============

export const withdrawalSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  method: z.enum(['pix', 'usdt_trc20']),
  destination: z.string().min(1, 'Destino é obrigatório'),
});

// ============ Investment Schemas ============

export const investmentSchema = z.object({
  planId: z.string().min(1, 'Plano de investimento é obrigatório'),
  amount: z.number().min(10, 'Investimento mínimo é $10 USDT'),
});

// ============ Admin Schemas ============

export const adminPlanSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  minAmount: z.string().min(1, 'Valor mínimo é obrigatório'),
  maxAmount: z.string().optional(),
  dailyRoiPct: z.string().min(1, 'ROI diário é obrigatório'),
  durationDays: z.number().int().min(1, 'Duração mínima é 1 dia').max(365, 'Duração máxima é 365 dias'),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const adminConfigSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  type: z.enum(['string', 'number', 'boolean', 'json', 'secret']).default('string'),
  description: z.string().optional(),
  category: z.enum(['general', 'branding', 'affiliate', 'withdrawal', 'trading', 'deposit', 'nowpayments']).default('general'),
});

export const adminUserUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  isActive: z.boolean().optional(),
  balance: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Saldo deve ser um número válido e não negativo').optional(),
  affiliateBalance: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, 'Saldo afiliado deve ser um número válido e não negativo').optional(),
  walletAddress: z.string().optional(),
  pixKey: z.string().optional(),
  linkUnlocked: z.boolean().optional(),
});

export const adminDepositActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  adminNotes: z.string().optional(),
});

export const adminWithdrawalActionSchema = z.object({
  action: z.enum(['approve', 'reject', 'complete']),
  adminNotes: z.string().optional(),
});

export const adminAffiliateLevelSchema = z.object({
  level: z.number().int().min(1).max(11),
  percentage: z.coerce.string().min(1, 'Porcentagem é obrigatória'),
  description: z.string().optional().default(''),
  isActive: z.boolean().default(true),
});

export const affiliateWithdrawalSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  method: z.enum(['pix', 'usdt_trc20']),
  destination: z.string().min(1, 'Destino é obrigatório'),
});

// ============ Type Exports ============

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type DepositInput = z.infer<typeof depositSchema>;
export type WithdrawalInput = z.infer<typeof withdrawalSchema>;
export type InvestmentInput = z.infer<typeof investmentSchema>;
export type AdminPlanInput = z.infer<typeof adminPlanSchema>;
export type AdminConfigInput = z.infer<typeof adminConfigSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
