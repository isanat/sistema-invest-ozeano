export type Locale = 'es' | 'en' | 'pt-BR' | 'zh'

export const localeNames: Record<Locale, string> = {
  es: 'Español',
  en: 'English',
  'pt-BR': 'Português',
  zh: '中文',
}

export const localeFlags: Record<Locale, string> = {
  es: '🇪🇸',
  en: '🇺🇸',
  'pt-BR': '🇧🇷',
  zh: '🇨🇳',
}

type TranslationKeys = {
  // General
  'general.invest': string
  'general.withdraw': string
  'general.balance': string
  'general.usdt': string
  'general.daily': string
  'general.monthly': string
  'general.perDay': string
  'general.total': string
  'general.active': string
  'general.completed': string
  'general.pending': string
  'general.cancelled': string
  'general.approved': string
  'general.rejected': string
  'general.processed': string
  'general.save': string
  'general.cancel': string
  'general.delete': string
  'general.edit': string
  'general.create': string
  'general.search': string
  'general.filter': string
  'general.loading': string
  'general.success': string
  'general.error': string
  'general.yes': string
  'general.no': string
  'general.close': string
  'general.back': string
  'general.next': string
  'general.previous': string
  'general.showMore': string
  'general.showLess': string

  // Auth
  'auth.login': string
  'auth.register': string
  'auth.logout': string
  'auth.email': string
  'auth.password': string
  'auth.name': string
  'auth.phone': string
  'auth.confirmPassword': string
  'auth.referralCode': string
  'auth.forgotPassword': string
  'auth.noAccount': string
  'auth.hasAccount': string
  'auth.loginTitle': string
  'auth.registerTitle': string
  'auth.loginSubtitle': string
  'auth.registerSubtitle': string

  // Landing - Navbar
  'landing.nav.plans': string
  'landing.nav.traders': string
  'landing.nav.affiliate': string
  'landing.nav.howItWorks': string
  'landing.nav.faq': string
  'landing.nav.login': string
  'landing.nav.register': string

  // Landing - Hero
  'landing.hero.badge': string
  'landing.hero.title': string
  'landing.hero.subtitle': string
  'landing.hero.description': string
  'landing.hero.cta': string
  'landing.hero.viewPlans': string
  'landing.hero.statRoi': string
  'landing.hero.statInvestors': string
  'landing.hero.statWinRate': string
  'landing.hero.statRoiLabel': string
  'landing.hero.statInvestorsLabel': string
  'landing.hero.statWinRateLabel': string

  // Landing - How it works
  'landing.how.title': string
  'landing.how.subtitle': string
  'landing.how.step1Title': string
  'landing.how.step1Desc': string
  'landing.how.step2Title': string
  'landing.how.step2Desc': string
  'landing.how.step3Title': string
  'landing.how.step3Desc': string
  'landing.how.step': string

  // Landing - Plans
  'landing.plans.title': string
  'landing.plans.subtitle': string
  'landing.plans.investment': string
  'landing.plans.dailyRoi': string
  'landing.plans.duration': string
  'landing.plans.estimatedReturn': string
  'landing.plans.investNow': string
  'landing.plans.days': string
  'landing.plans.popular': string
  'landing.plans.premium': string

  // Landing - Traders
  'landing.traders.title': string
  'landing.traders.subtitle': string
  'landing.traders.winRate': string
  'landing.traders.monthlyRoi': string
  'landing.traders.risk': string
  'landing.traders.riskLow': string
  'landing.traders.riskMedium': string
  'landing.traders.riskHigh': string
  'landing.traders.viewAll': string

  // Landing - Affiliate
  'landing.affiliate.title': string
  'landing.affiliate.subtitle': string
  'landing.affiliate.commissionByLevel': string
  'landing.affiliate.teamBonus': string
  'landing.affiliate.directReferrals': string
  'landing.affiliate.additionalDailyRoi': string
  'landing.affiliate.level': string
  'landing.affiliate.startEarning': string
  'landing.affiliate.cta': string

  // Landing - Team Bonus (ActionCash)
  'landing.teamBonus.title': string
  'landing.teamBonus.subtitle': string
  'landing.teamBonus.salary': string
  'landing.teamBonus.salaryDesc': string
  'landing.teamBonus.minTeam': string
  'landing.teamBonus.sundays': string
  'landing.teamBonus.gold': string
  'landing.teamBonus.goldDesc': string
  'landing.teamBonus.daymond': string
  'landing.teamBonus.daymondDesc': string
  'landing.teamBonus.renewable': string
  'landing.teamBonus.daymondPremium': string
  'landing.teamBonus.daymondPremiumDesc': string
  'landing.teamBonus.dailyCap': string
  'landing.unilevel.inLevels': string
  'landing.unilevel.title': string
  'landing.unilevel.subtitle': string
  'landing.unilevel.level': string
  'landing.unilevel.total': string

  // Landing - Badges
  'landing.badges.copyTrading': string
  'landing.badges.liveDashboard': string
  'landing.badges.portfolioValue': string
  'landing.badges.winRate': string
  'landing.badges.trading': string
  'landing.badges.dailyRoi': string
  'landing.badges.simplePowerful': string
  'landing.badges.step': string
  'landing.badges.topTraders': string
  'landing.badges.dailyRoiTag': string
  'landing.badges.careerPlan': string
  'landing.badges.teamRewards': string
  'landing.badges.referralProgram': string
  'landing.badges.live': string
  'landing.badges.popular': string

  // Landing - Career Plan
  'landing.career.title': string
  'landing.career.subtitle': string
  'landing.career.progression': string
  'landing.career.unlockNext': string

  // Landing - FAQ
  'landing.faq.title': string
  'landing.faq.subtitle': string
  'landing.faq.q1': string
  'landing.faq.a1': string
  'landing.faq.q2': string
  'landing.faq.a2': string
  'landing.faq.q3': string
  'landing.faq.a3': string
  'landing.faq.q4': string
  'landing.faq.a4': string
  'landing.faq.q5': string
  'landing.faq.a5': string
  'landing.faq.q6': string
  'landing.faq.a6': string
  'landing.faq.q7': string
  'landing.faq.a7': string

  // Landing - Footer
  'landing.footer.brand': string
  'landing.footer.description': string
  'landing.footer.platform': string
  'landing.footer.support': string
  'landing.footer.community': string
  'landing.footer.helpCenter': string
  'landing.footer.terms': string
  'landing.footer.privacy': string
  'landing.footer.contact': string
  'landing.footer.rights': string
  'landing.footer.disclaimer': string

  // Dashboard - Sidebar
  'dash.sidebar.overview': string
  'dash.sidebar.invest': string
  'dash.sidebar.myPlans': string
  'dash.sidebar.copyTraders': string
  'dash.sidebar.affiliate': string
  'dash.sidebar.teamBonus': string
  'dash.sidebar.withdrawals': string
  'dash.sidebar.transfer': string
  'dash.sidebar.admin': string

  // Dashboard - Overview
  'dash.overview.welcome': string
  'dash.overview.welcomeSubtitle': string
  'dash.overview.availableBalance': string
  'dash.overview.totalInvested': string
  'dash.overview.totalRoi': string
  'dash.overview.activeInvestments': string
  'dash.overview.totalWithdrawals': string
  'dash.overview.roiChart': string
  'dash.overview.quickActions': string
  'dash.overview.recentTransactions': string

  // Dashboard - Invest
  'dash.invest.title': string
  'dash.invest.subtitle': string
  'dash.invest.selectPlan': string
  'dash.invest.amount': string
  'dash.invest.minAmount': string
  'dash.invest.maxAmount': string
  'dash.invest.confirmInvest': string
  'dash.invest.dailyReturn': string
  'dash.invest.totalReturn': string
  'dash.invest.paymentMethod': string
  'dash.invest.depositAddress': string
  'dash.invest.sendUsdt': string

  // Dashboard - Plans
  'dash.plans.title': string
  'dash.plans.subtitle': string
  'dash.plans.noPlans': string
  'dash.plans.progress': string
  'dash.plans.earned': string
  'dash.plans.daysLeft': string

  // Dashboard - Withdrawals
  'dash.withdrawals.title': string
  'dash.withdrawals.subtitle': string
  'dash.withdrawals.amount': string
  'dash.withdrawals.walletAddress': string
  'dash.withdrawals.requestWithdrawal': string
  'dash.withdrawals.history': string
  'dash.withdrawals.minWithdrawal': string
  'dash.withdrawals.noWithdrawals': string
  'dash.withdrawals.fee': string
  'dash.withdrawals.netAmount': string

  // Dashboard - Affiliate
  'dash.affiliate.title': string
  'dash.affiliate.subtitle': string
  'dash.affiliate.referralLink': string
  'dash.affiliate.copyLink': string
  'dash.affiliate.directReferrals': string
  'dash.affiliate.commissionHistory': string
  'dash.affiliate.totalCommission': string
  'dash.affiliate.level': string

  // Dashboard - Team Bonus
  'dash.team.title': string
  'dash.team.subtitle': string
  'dash.team.currentTier': string
  'dash.team.nextTier': string
  'dash.team.referralsNeeded': string
  'dash.team.bonusOnRoi': string

  // Dashboard - Transfer
  'dash.transfer.title': string
  'dash.transfer.subtitle': string
  'dash.transfer.recipientEmail': string
  'dash.transfer.recipientEmailPlaceholder': string
  'dash.transfer.lookupUser': string
  'dash.transfer.foundUser': string
  'dash.transfer.userNotFound': string
  'dash.transfer.amount': string
  'dash.transfer.amountPlaceholder': string
  'dash.transfer.fee': string
  'dash.transfer.netAmount': string
  'dash.transfer.totalDebit': string
  'dash.transfer.sendTransfer': string
  'dash.transfer.config': string
  'dash.transfer.minAmount': string
  'dash.transfer.maxAmount': string
  'dash.transfer.feePct': string
  'dash.transfer.dailyLimit': string
  'dash.transfer.cooldown': string
  'dash.transfer.enabled': string
  'dash.transfer.disabled': string
  'dash.transfer.history': string
  'dash.transfer.noTransfers': string
  'dash.transfer.sent': string
  'dash.transfer.received': string
  'dash.transfer.completed': string
  'dash.transfer.transferSuccess': string
  'dash.transfer.dailyUsed': string
  'dash.transfer.cooldownRemaining': string

  // Admin
  'admin.dashboard': string
  'admin.plans': string
  'admin.copyTraders': string
  'admin.pools': string
  'admin.users': string
  'admin.withdrawals': string
  'admin.settings': string
  'admin.affiliateLevels': string
  'admin.ranks': string
  'admin.nowpayments': string
  'admin.totalUsers': string
  'admin.totalInvested': string
  'admin.totalRoiDistributed': string
  'admin.pendingWithdrawals': string

  // NowPayments
  'nowpayments.deposit': string
  'nowpayments.withdraw': string
  'nowpayments.status': string
  'nowpayments.waiting': string
  'nowpayments.confirming': string
  'nowpayments.sending': string
  'nowpayments.finished': string
  'nowpayments.failed': string
  'nowpayments.expired': string
  'nowpayments.refunded': string
  'nowpayments.network': string
  'nowpayments.address': string
  'nowpayments.amount': string
  'nowpayments.scanQr': string
  'nowpayments.sendExact': string
}

export const translations: Record<Locale, TranslationKeys> = {
  es: {
    // General
    'general.invest': 'Invertir',
    'general.withdraw': 'Retirar',
    'general.balance': 'Saldo',
    'general.usdt': 'USDT',
    'general.daily': 'Diario',
    'general.monthly': 'Mensual',
    'general.perDay': '/día',
    'general.total': 'Total',
    'general.active': 'Activo',
    'general.completed': 'Completado',
    'general.pending': 'Pendiente',
    'general.cancelled': 'Cancelado',
    'general.approved': 'Aprobado',
    'general.rejected': 'Rechazado',
    'general.processed': 'Procesado',
    'general.save': 'Guardar',
    'general.cancel': 'Cancelar',
    'general.delete': 'Eliminar',
    'general.edit': 'Editar',
    'general.create': 'Crear',
    'general.search': 'Buscar',
    'general.filter': 'Filtrar',
    'general.loading': 'Cargando...',
    'general.success': 'Éxito',
    'general.error': 'Error',
    'general.yes': 'Sí',
    'general.no': 'No',
    'general.close': 'Cerrar',
    'general.back': 'Volver',
    'general.next': 'Siguiente',
    'general.previous': 'Anterior',
    'general.showMore': 'Ver más',
    'general.showLess': 'Ver menos',

    // Auth
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Registrarse',
    'auth.logout': 'Cerrar Sesión',
    'auth.email': 'Correo electrónico',
    'auth.password': 'Contraseña',
    'auth.name': 'Nombre completo',
    'auth.phone': 'Teléfono',
    'auth.confirmPassword': 'Confirmar contraseña',
    'auth.referralCode': 'Código de referido',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.noAccount': '¿No tienes cuenta?',
    'auth.hasAccount': '¿Ya tienes cuenta?',
    'auth.loginTitle': 'Bienvenido de vuelta',
    'auth.registerTitle': 'Crea tu cuenta',
    'auth.loginSubtitle': 'Accede a tu panel de inversión',
    'auth.registerSubtitle': 'Comienza a ganar con Copy Trading',

    // Landing - Navbar
    'landing.nav.plans': 'Planes',
    'landing.nav.traders': 'Traders',
    'landing.nav.affiliate': 'Afiliados',
    'landing.nav.howItWorks': 'Cómo Funciona',
    'landing.nav.faq': 'FAQ',
    'landing.nav.login': 'Ingresar',
    'landing.nav.register': 'Registrarse',

    // Landing - Hero
    'landing.hero.badge': 'Copy Trading Automatizado con IA',
    'landing.hero.title': 'ActionCash',
    'landing.hero.subtitle': 'Copy Trading Automatizado',
    'landing.hero.description': 'Gana hasta <bold>3.3% de ROI diario</bold> con Copy Trading Automatizado. Invierte en USDT y recibe rendimientos diarios automáticos.',
    'landing.hero.cta': 'Comenzar Ahora',
    'landing.hero.viewPlans': 'Ver Planes',
    'landing.hero.statRoi': '+$2.5M',
    'landing.hero.statInvestors': '15K+',
    'landing.hero.statWinRate': '89%',
    'landing.hero.statRoiLabel': 'ROI Distribuido',
    'landing.hero.statInvestorsLabel': 'Inversores',
    'landing.hero.statWinRateLabel': 'Win Rate',

    // Landing - How it works
    'landing.how.title': 'Cómo <em>Funciona</em>',
    'landing.how.subtitle': 'Tres pasos simples para empezar a ganar con Copy Trading',
    'landing.how.step1Title': 'Elige tu Plan',
    'landing.how.step1Desc': 'Selecciona el plan ideal para tu perfil de inversión',
    'landing.how.step2Title': 'Invierte con USDT',
    'landing.how.step2Desc': 'Realiza tu inversión en USDT de forma segura y rápida',
    'landing.how.step3Title': 'Recibe ROI Diario',
    'landing.how.step3Desc': 'Gana retorno diario automático directo en tu cuenta',
    'landing.how.step': 'Paso',

    // Landing - Plans
    'landing.plans.title': 'Planes de <em>Inversión</em>',
    'landing.plans.subtitle': 'Elige el plan que mejor se adapte a tu perfil',
    'landing.plans.investment': 'Inversión',
    'landing.plans.dailyRoi': 'ROI Diario',
    'landing.plans.duration': 'Duración',
    'landing.plans.estimatedReturn': 'Retorno Estimado',
    'landing.plans.investNow': 'Invertir Ahora',
    'landing.plans.days': 'días',
    'landing.plans.popular': 'Popular',
    'landing.plans.premium': 'Premium',

    // Landing - Traders
    'landing.traders.title': '<em>Copy Traders</em> Destacados',
    'landing.traders.subtitle': 'Sigue a los mejores traders y copia sus estrategias automáticamente',
    'landing.traders.winRate': 'Win Rate',
    'landing.traders.monthlyRoi': 'ROI Mensual',
    'landing.traders.risk': 'Riesgo',
    'landing.traders.riskLow': 'Bajo',
    'landing.traders.riskMedium': 'Medio',
    'landing.traders.riskHigh': 'Alto',
    'landing.traders.viewAll': 'Ver Todos',

    // Landing - Affiliate
    'landing.affiliate.title': 'Programa de <em>Afiliados</em>',
    'landing.affiliate.subtitle': 'Plan Carrera Unilevel - 6 Niveles de Comisiones',
    'landing.affiliate.commissionByLevel': 'Comisiones por Nivel',
    'landing.affiliate.teamBonus': 'Bono de Equipe',
    'landing.affiliate.directReferrals': 'referidos directos activos',
    'landing.affiliate.additionalDailyRoi': 'Bono adicional en el ROI diario',
    'landing.affiliate.level': 'Nivel',
    'landing.affiliate.startEarning': 'Empezar a Ganar',
    'landing.affiliate.cta': 'Empezar a Ganar',

    // Landing - Team Bonus (ActionCash)
    'landing.teamBonus.title': 'Bônus de Equipe ActionCash',
    'landing.teamBonus.subtitle': '4 programas exclusivos para multiplicar tus ganancias con tu equipo',
    'landing.teamBonus.salary': 'Salário Semanal',
    'landing.teamBonus.salaryDesc': 'del capital activo de tu equipo',
    'landing.teamBonus.minTeam': 'Mín. equipo',
    'landing.teamBonus.sundays': 'Se paga todos los domingos',
    'landing.teamBonus.gold': 'Action Gold',
    'landing.teamBonus.goldDesc': 'del salario semanal de tus referidos directos',
    'landing.teamBonus.daymond': 'Action Daymond',
    'landing.teamBonus.daymondDesc': 'Paquete con ROI diario de 3.3%',
    'landing.teamBonus.renewable': 'Renovable',
    'landing.teamBonus.daymondPremium': 'Daymond Premium',
    'landing.teamBonus.daymondPremiumDesc': 'Paquete premium con ROI diario de 3.3%',
    'landing.teamBonus.dailyCap': 'Cap diario',
    'landing.unilevel.inLevels': 'en {n} niveles',
    'landing.unilevel.title': 'Programa de <em>Afiliados</em>',
    'landing.unilevel.subtitle': 'Gana comisiones en 6 niveles con nuestro plan Unilevel',
    'landing.unilevel.level': 'Nivel',
    'landing.unilevel.total': 'Total',

    // Landing - Badges
    'landing.badges.copyTrading': 'Plataforma de Copy Trading',
    'landing.badges.liveDashboard': 'Panel de Trading en Vivo',
    'landing.badges.portfolioValue': 'Valor del Portafolio',
    'landing.badges.winRate': 'Tasa de Acierto',
    'landing.badges.trading': 'Trading',
    'landing.badges.dailyRoi': 'ROI Diario',
    'landing.badges.simplePowerful': 'Simple y Potente',
    'landing.badges.step': 'PASO',
    'landing.badges.topTraders': 'Top Traders',
    'landing.badges.dailyRoiTag': 'RENDIMIENTO DIARIO',
    'landing.badges.careerPlan': 'PLAN DE CARRERA',
    'landing.badges.teamRewards': 'RECOMPENSAS DE EQUIPO',
    'landing.badges.referralProgram': 'PROGRAMA DE AFILIADOS',
    'landing.badges.live': 'EN VIVO',
    'landing.badges.popular': 'POPULAR',

    // Landing - Career Plan
    'landing.career.title': 'Plano de <em>Carrera</em>',
    'landing.career.subtitle': 'Escala tu equipo y desbloquea bonificaciones exclusivas en cada nivel',
    'landing.career.progression': 'Progresión de Carrera',
    'landing.career.unlockNext': 'Desbloquea el siguiente nivel',

    // Landing - FAQ
    'landing.faq.title': 'Preguntas <em>Frecuentes</em>',
    'landing.faq.subtitle': 'Resuelve tus dudas sobre la plataforma',
    'landing.faq.q1': '¿Qué es Copy Trading?',
    'landing.faq.a1': 'Copy Trading es una forma de inversión donde copias automáticamente las operaciones de traders profesionales. En ActionCash, nuestros traders experimentados realizan operaciones y tú recibes el ROI diario automáticamente.',
    'landing.faq.q2': '¿Cómo funciona el ROI diario?',
    'landing.faq.a2': 'El ROI diario se calcula según el plan elegido. Por ejemplo, en el plan Silver (2.5% al día), una inversión de $100 genera $2.50 por día. El rendimiento se acredita automáticamente en tu cuenta.',
    'landing.faq.q3': '¿Cuál es el monto mínimo para invertir?',
    'landing.faq.a3': 'El monto mínimo es de $5 USDT. Con el ROI diario de 3.3%, puedes empezar a generar ganancias desde el primer día. Además, accede a los Bônus de Equipe ActionCash según crezca tu equipo.',
    'landing.faq.q4': '¿Cómo hago retiros?',
    'landing.faq.a4': 'Puedes solicitar retiro en cualquier momento desde tu panel. El mínimo para retiro es de $10 USDT. Los retiros se procesan en hasta 24 horas hábiles, sin comisión.',
    'landing.faq.q5': '¿Cómo funciona el programa de afiliados?',
    'landing.faq.a5': 'Nuestro programa Unilevel posee 6 niveles de comisiones: L1=5%, L2=3%, L3=1%, L4=1%, L5=1%, L6=2% (total 13%). Además, accede a los Bônus de Equipe: Salário Semanal, Action Gold, Action Daymond y Daymond Premium según el capital de tu equipo.',
    'landing.faq.q6': '¿Es seguro invertir?',
    'landing.faq.a6': 'Utilizamos estrategias de trading probadas con win rate de 89%. Nuestro sistema opera con stop loss y gestión de riesgo. Sin embargo, toda inversión involucra riesgos y rentabilidad pasada no garantiza resultados futuros.',
    'landing.faq.q7': '¿Cuáles son las formas de pago?',
    'landing.faq.a7': 'Actualmente aceptamos USDT (Tether) en la red TRC-20. Es una stablecoin vinculada al dólar, garantizando estabilidad en el valor.',

    // Landing - Footer
    'landing.footer.brand': 'ActionCash',
    'landing.footer.description': 'Copy Trading Automatizado con ROI diario. Invierte en USDT y gana rendimientos automáticos.',
    'landing.footer.platform': 'Plataforma',
    'landing.footer.support': 'Soporte',
    'landing.footer.community': 'Comunidad',
    'landing.footer.helpCenter': 'Centro de Ayuda',
    'landing.footer.terms': 'Términos de Uso',
    'landing.footer.privacy': 'Política de Privacidad',
    'landing.footer.contact': 'Contacto',
    'landing.footer.rights': 'Todos los derechos reservados.',
    'landing.footer.disclaimer': 'Toda inversión involucra riesgos. Rentabilidad pasada no garantiza resultados futuros.',

    // Dashboard - Sidebar
    'dash.sidebar.overview': 'Panel General',
    'dash.sidebar.invest': 'Invertir',
    'dash.sidebar.myPlans': 'Mis Planes',
    'dash.sidebar.copyTraders': 'Copy Traders',
    'dash.sidebar.affiliate': 'Afiliados',
    'dash.sidebar.teamBonus': 'Bono Equipo',
    'dash.sidebar.withdrawals': 'Retiros',
    'dash.sidebar.transfer': 'Transferencia',
    'dash.sidebar.admin': 'Admin',

    // Dashboard - Overview
    'dash.overview.welcome': 'Hola',
    'dash.overview.welcomeSubtitle': 'Aquí está el resumen de tu cuenta',
    'dash.overview.availableBalance': 'Saldo Disponible',
    'dash.overview.totalInvested': 'Total Invertido',
    'dash.overview.totalRoi': 'ROI Total',
    'dash.overview.activeInvestments': 'Inversiones Activas',
    'dash.overview.totalWithdrawals': 'Retiros Totales',
    'dash.overview.roiChart': 'ROI Últimos 7 Días (%)',
    'dash.overview.quickActions': 'Acciones Rápidas',
    'dash.overview.recentTransactions': 'Transacciones Recientes',

    // Dashboard - Invest
    'dash.invest.title': 'Invertir',
    'dash.invest.subtitle': 'Selecciona un plan y realiza tu inversión',
    'dash.invest.selectPlan': 'Seleccionar Plan',
    'dash.invest.amount': 'Monto',
    'dash.invest.minAmount': 'Monto mínimo',
    'dash.invest.maxAmount': 'Monto máximo',
    'dash.invest.confirmInvest': 'Confirmar Inversión',
    'dash.invest.dailyReturn': 'Retorno Diario',
    'dash.invest.totalReturn': 'Retorno Total',
    'dash.invest.paymentMethod': 'Método de Pago',
    'dash.invest.depositAddress': 'Dirección de Depósito',
    'dash.invest.sendUsdt': 'Enviar USDT',

    // Dashboard - Plans
    'dash.plans.title': 'Mis Planes',
    'dash.plans.subtitle': 'Seguimiento de tus inversiones activas',
    'dash.plans.noPlans': 'No tienes planes activos. ¡Comienza a invertir!',
    'dash.plans.progress': 'Progreso',
    'dash.plans.earned': 'Ganado',
    'dash.plans.daysLeft': 'Días restantes',

    // Dashboard - Withdrawals
    'dash.withdrawals.title': 'Retiros',
    'dash.withdrawals.subtitle': 'Solicita y gestiona tus retiros',
    'dash.withdrawals.amount': 'Monto',
    'dash.withdrawals.walletAddress': 'Dirección de Wallet',
    'dash.withdrawals.requestWithdrawal': 'Solicitar Retiro',
    'dash.withdrawals.history': 'Historial de Retiros',
    'dash.withdrawals.minWithdrawal': 'Retiro mínimo',
    'dash.withdrawals.noWithdrawals': 'No tienes retiros registrados.',
    'dash.withdrawals.fee': 'Comisión',
    'dash.withdrawals.netAmount': 'Monto neto',

    // Dashboard - Affiliate
    'dash.affiliate.title': 'Programa de Afiliados',
    'dash.affiliate.subtitle': 'Invita y gana comisiones',
    'dash.affiliate.referralLink': 'Link de Referido',
    'dash.affiliate.copyLink': 'Copiar Link',
    'dash.affiliate.directReferrals': 'Referidos Directos',
    'dash.affiliate.commissionHistory': 'Historial de Comisiones',
    'dash.affiliate.totalCommission': 'Comisión Total',
    'dash.affiliate.level': 'Nivel',

    // Dashboard - Team Bonus
    'dash.team.title': 'Bono de Equipo',
    'dash.team.subtitle': 'Alcanza metas y obtén bonos adicionales',
    'dash.team.currentTier': 'Nivel Actual',
    'dash.team.nextTier': 'Próximo Nivel',
    'dash.team.referralsNeeded': 'Referidos necesarios',
    'dash.team.bonusOnRoi': 'Bono en ROI',

    // Dashboard - Transfer
    'dash.transfer.title': 'Transferencia',
    'dash.transfer.subtitle': 'Envía USDT a otro usuario de la plataforma',
    'dash.transfer.recipientEmail': 'Email del destinatario',
    'dash.transfer.recipientEmailPlaceholder': 'usuario@email.com',
    'dash.transfer.lookupUser': 'Buscar',
    'dash.transfer.foundUser': 'Usuario encontrado',
    'dash.transfer.userNotFound': 'Usuario no encontrado',
    'dash.transfer.amount': 'Monto',
    'dash.transfer.amountPlaceholder': '0.00',
    'dash.transfer.fee': 'Comisión',
    'dash.transfer.netAmount': 'Monto neto',
    'dash.transfer.totalDebit': 'Total débito',
    'dash.transfer.sendTransfer': 'Enviar Transferencia',
    'dash.transfer.config': 'Configuración',
    'dash.transfer.minAmount': 'Monto mínimo',
    'dash.transfer.maxAmount': 'Monto máximo',
    'dash.transfer.feePct': 'Comisión',
    'dash.transfer.dailyLimit': 'Límite diario',
    'dash.transfer.cooldown': 'Espera entre transferencias',
    'dash.transfer.enabled': 'Habilitado',
    'dash.transfer.disabled': 'Deshabilitado',
    'dash.transfer.history': 'Historial de transferencias',
    'dash.transfer.noTransfers': 'No tienes transferencias registradas.',
    'dash.transfer.sent': 'Enviado',
    'dash.transfer.received': 'Recibido',
    'dash.transfer.completed': 'Completado',
    'dash.transfer.transferSuccess': '¡Transferencia enviada exitosamente!',
    'dash.transfer.dailyUsed': 'Usados hoy',
    'dash.transfer.cooldownRemaining': 'Espera restante',

    // Admin
    'admin.dashboard': 'Dashboard Admin',
    'admin.plans': 'Planes',
    'admin.copyTraders': 'Copy Traders',
    'admin.pools': 'Pools',
    'admin.users': 'Usuarios',
    'admin.withdrawals': 'Retiros',
    'admin.settings': 'Configuración',
    'admin.affiliateLevels': 'Niveles Afiliado',
    'admin.ranks': 'Ranks',
    'admin.nowpayments': 'NowPayments',
    'admin.totalUsers': 'Total Usuarios',
    'admin.totalInvested': 'Total Invertido',
    'admin.totalRoiDistributed': 'ROI Distribuido',
    'admin.pendingWithdrawals': 'Retiros Pendientes',

    // NowPayments
    'nowpayments.deposit': 'Depositar',
    'nowpayments.withdraw': 'Retirar',
    'nowpayments.status': 'Estado',
    'nowpayments.waiting': 'Esperando pago',
    'nowpayments.confirming': 'Confirmando',
    'nowpayments.sending': 'Enviando',
    'nowpayments.finished': 'Completado',
    'nowpayments.failed': 'Fallido',
    'nowpayments.expired': 'Expirado',
    'nowpayments.refunded': 'Reembolsado',
    'nowpayments.network': 'Red',
    'nowpayments.address': 'Dirección',
    'nowpayments.amount': 'Monto',
    'nowpayments.scanQr': 'Escanea el QR',
    'nowpayments.sendExact': 'Envía exactamente este monto a la dirección',
  },

  en: {
    'general.invest': 'Invest',
    'general.withdraw': 'Withdraw',
    'general.balance': 'Balance',
    'general.usdt': 'USDT',
    'general.daily': 'Daily',
    'general.monthly': 'Monthly',
    'general.perDay': '/day',
    'general.total': 'Total',
    'general.active': 'Active',
    'general.completed': 'Completed',
    'general.pending': 'Pending',
    'general.cancelled': 'Cancelled',
    'general.approved': 'Approved',
    'general.rejected': 'Rejected',
    'general.processed': 'Processed',
    'general.save': 'Save',
    'general.cancel': 'Cancel',
    'general.delete': 'Delete',
    'general.edit': 'Edit',
    'general.create': 'Create',
    'general.search': 'Search',
    'general.filter': 'Filter',
    'general.loading': 'Loading...',
    'general.success': 'Success',
    'general.error': 'Error',
    'general.yes': 'Yes',
    'general.no': 'No',
    'general.close': 'Close',
    'general.back': 'Back',
    'general.next': 'Next',
    'general.previous': 'Previous',
    'general.showMore': 'Show more',
    'general.showLess': 'Show less',

    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.logout': 'Logout',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.name': 'Full Name',
    'auth.phone': 'Phone',
    'auth.confirmPassword': 'Confirm Password',
    'auth.referralCode': 'Referral Code',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': "Don't have an account?",
    'auth.hasAccount': 'Already have an account?',
    'auth.loginTitle': 'Welcome back',
    'auth.registerTitle': 'Create your account',
    'auth.loginSubtitle': 'Access your investment panel',
    'auth.registerSubtitle': 'Start earning with Copy Trading',

    'landing.nav.plans': 'Plans',
    'landing.nav.traders': 'Traders',
    'landing.nav.affiliate': 'Affiliates',
    'landing.nav.howItWorks': 'How It Works',
    'landing.nav.faq': 'FAQ',
    'landing.nav.login': 'Login',
    'landing.nav.register': 'Register',

    'landing.hero.badge': 'AI-Powered Automated Copy Trading',
    'landing.hero.title': 'ActionCash',
    'landing.hero.subtitle': 'Automated Copy Trading',
    'landing.hero.description': 'Earn up to <bold>3.3% daily ROI</bold> with Automated Copy Trading. Invest in USDT and receive automatic daily returns.',
    'landing.hero.cta': 'Start Now',
    'landing.hero.viewPlans': 'View Plans',
    'landing.hero.statRoi': '+$2.5M',
    'landing.hero.statInvestors': '15K+',
    'landing.hero.statWinRate': '89%',
    'landing.hero.statRoiLabel': 'ROI Distributed',
    'landing.hero.statInvestorsLabel': 'Investors',
    'landing.hero.statWinRateLabel': 'Win Rate',

    'landing.how.title': 'How It <em>Works</em>',
    'landing.how.subtitle': 'Three simple steps to start earning with Copy Trading',
    'landing.how.step1Title': 'Choose Your Plan',
    'landing.how.step1Desc': 'Select the ideal plan for your investment profile',
    'landing.how.step2Title': 'Invest with USDT',
    'landing.how.step2Desc': 'Make your investment in USDT securely and quickly',
    'landing.how.step3Title': 'Receive Daily ROI',
    'landing.how.step3Desc': 'Earn automatic daily returns directly in your account',
    'landing.how.step': 'Step',

    'landing.plans.title': 'Investment <em>Plans</em>',
    'landing.plans.subtitle': 'Choose the plan that best fits your profile',
    'landing.plans.investment': 'Investment',
    'landing.plans.dailyRoi': 'Daily ROI',
    'landing.plans.duration': 'Duration',
    'landing.plans.estimatedReturn': 'Estimated Return',
    'landing.plans.investNow': 'Invest Now',
    'landing.plans.days': 'days',
    'landing.plans.popular': 'Popular',
    'landing.plans.premium': 'Premium',

    'landing.traders.title': 'Featured <em>Copy Traders</em>',
    'landing.traders.subtitle': 'Follow the best traders and copy their strategies automatically',
    'landing.traders.winRate': 'Win Rate',
    'landing.traders.monthlyRoi': 'Monthly ROI',
    'landing.traders.risk': 'Risk',
    'landing.traders.riskLow': 'Low',
    'landing.traders.riskMedium': 'Medium',
    'landing.traders.riskHigh': 'High',
    'landing.traders.viewAll': 'View All',

    'landing.affiliate.title': 'Affiliate <em>Program</em>',
    'landing.affiliate.subtitle': 'Unilevel Career Plan - 6 Commission Levels',
    'landing.affiliate.commissionByLevel': 'Commission by Level',
    'landing.affiliate.teamBonus': 'Team Bonus',
    'landing.affiliate.directReferrals': 'active direct referrals',
    'landing.affiliate.additionalDailyRoi': 'Additional bonus on daily ROI',
    'landing.affiliate.level': 'Level',
    'landing.affiliate.startEarning': 'Start Earning',
    'landing.affiliate.cta': 'Start Earning',

    // Landing - Team Bonus (ActionCash)
    'landing.teamBonus.title': 'ActionCash Team Bonuses',
    'landing.teamBonus.subtitle': '4 exclusive programs to multiply your earnings with your team',
    'landing.teamBonus.salary': 'Weekly Salary',
    'landing.teamBonus.salaryDesc': 'of your team\'s active capital',
    'landing.teamBonus.minTeam': 'Min. team',
    'landing.teamBonus.sundays': 'Paid every Sunday',
    'landing.teamBonus.gold': 'Action Gold',
    'landing.teamBonus.goldDesc': 'of your direct referrals\' weekly salary',
    'landing.teamBonus.daymond': 'Action Daymond',
    'landing.teamBonus.daymondDesc': 'Package with 3.3% daily ROI',
    'landing.teamBonus.renewable': 'Renewable',
    'landing.teamBonus.daymondPremium': 'Daymond Premium',
    'landing.teamBonus.daymondPremiumDesc': 'Premium package with 3.3% daily ROI',
    'landing.teamBonus.dailyCap': 'Daily cap',
    'landing.unilevel.inLevels': 'in {n} levels',
    'landing.unilevel.title': 'Affiliate <em>Program</em>',
    'landing.unilevel.subtitle': 'Earn commissions in 6 levels with our Unilevel plan',
    'landing.unilevel.level': 'Level',
    'landing.unilevel.total': 'Total',

    // Landing - Badges
    'landing.badges.copyTrading': 'Copy Trading Platform',
    'landing.badges.liveDashboard': 'Live Trading Dashboard',
    'landing.badges.portfolioValue': 'Portfolio Value',
    'landing.badges.winRate': 'Win Rate',
    'landing.badges.trading': 'Trading',
    'landing.badges.dailyRoi': 'Daily ROI',
    'landing.badges.simplePowerful': 'Simple & Powerful',
    'landing.badges.step': 'STEP',
    'landing.badges.topTraders': 'Top Traders',
    'landing.badges.dailyRoiTag': 'DAILY ROI',
    'landing.badges.careerPlan': 'CAREER PLAN',
    'landing.badges.teamRewards': 'TEAM REWARDS',
    'landing.badges.referralProgram': 'REFERRAL PROGRAM',
    'landing.badges.live': 'LIVE',
    'landing.badges.popular': 'POPULAR',

    // Landing - Career Plan
    'landing.career.title': 'Career <em>Plan</em>',
    'landing.career.subtitle': 'Scale your team and unlock exclusive bonuses at each level',
    'landing.career.progression': 'Career Progression',
    'landing.career.unlockNext': 'Unlock next level',

    'landing.faq.title': 'Frequently <em>Asked</em> Questions',
    'landing.faq.subtitle': 'Clear your doubts about the platform',
    'landing.faq.q1': 'What is Copy Trading?',
    'landing.faq.a1': 'Copy Trading is a form of investment where you automatically copy the operations of professional traders. At ActionCash, our experienced traders execute trades and you receive daily ROI automatically.',
    'landing.faq.q2': 'How does the daily ROI work?',
    'landing.faq.a2': 'The daily ROI is calculated based on the chosen plan. For example, on the Silver plan (2.5% per day), a $100 investment generates $2.50 per day. Earnings are automatically credited to your account.',
    'landing.faq.q3': 'What is the minimum amount to invest?',
    'landing.faq.a3': 'The minimum amount is $5 USDT. With a 3.3% daily ROI, you can start earning from day one. Additionally, access ActionCash Team Bonuses as your team grows.',
    'landing.faq.q4': 'How do I make withdrawals?',
    'landing.faq.a4': 'You can request a withdrawal at any time from your panel. The minimum withdrawal is $10 USDT. Withdrawals are processed within 24 business hours, with no fees.',
    'landing.faq.q5': 'How does the affiliate program work?',
    'landing.faq.a5': 'Our Unilevel program has 6 commission levels: L1=5%, L2=3%, L3=1%, L4=1%, L5=1%, L6=2% (13% total). Additionally, access Team Bonuses: Weekly Salary, Action Gold, Action Daymond, and Daymond Premium based on your team\'s capital.',
    'landing.faq.q6': 'Is it safe to invest?',
    'landing.faq.a6': 'We use proven trading strategies with an 89% win rate. Our system operates with stop loss and risk management. However, all investments involve risks and past performance does not guarantee future results.',
    'landing.faq.q7': 'What payment methods are available?',
    'landing.faq.a7': 'We currently accept USDT (Tether) on the TRC-20 network. It is a stablecoin pegged to the dollar, ensuring value stability.',

    'landing.footer.brand': 'ActionCash',
    'landing.footer.description': 'Automated Copy Trading with daily ROI. Invest in USDT and earn automatic returns.',
    'landing.footer.platform': 'Platform',
    'landing.footer.support': 'Support',
    'landing.footer.community': 'Community',
    'landing.footer.helpCenter': 'Help Center',
    'landing.footer.terms': 'Terms of Use',
    'landing.footer.privacy': 'Privacy Policy',
    'landing.footer.contact': 'Contact',
    'landing.footer.rights': 'All rights reserved.',
    'landing.footer.disclaimer': 'All investments involve risks. Past performance does not guarantee future results.',

    'dash.sidebar.overview': 'Overview',
    'dash.sidebar.invest': 'Invest',
    'dash.sidebar.myPlans': 'My Plans',
    'dash.sidebar.copyTraders': 'Copy Traders',
    'dash.sidebar.affiliate': 'Affiliates',
    'dash.sidebar.teamBonus': 'Team Bonus',
    'dash.sidebar.withdrawals': 'Withdrawals',
    'dash.sidebar.transfer': 'Transfer',
    'dash.sidebar.admin': 'Admin',

    'dash.overview.welcome': 'Hello',
    'dash.overview.welcomeSubtitle': 'Here is your account summary',
    'dash.overview.availableBalance': 'Available Balance',
    'dash.overview.totalInvested': 'Total Invested',
    'dash.overview.totalRoi': 'Total ROI',
    'dash.overview.activeInvestments': 'Active Investments',
    'dash.overview.totalWithdrawals': 'Total Withdrawals',
    'dash.overview.roiChart': 'ROI Last 7 Days (%)',
    'dash.overview.quickActions': 'Quick Actions',
    'dash.overview.recentTransactions': 'Recent Transactions',

    'dash.invest.title': 'Invest',
    'dash.invest.subtitle': 'Select a plan and make your investment',
    'dash.invest.selectPlan': 'Select Plan',
    'dash.invest.amount': 'Amount',
    'dash.invest.minAmount': 'Minimum amount',
    'dash.invest.maxAmount': 'Maximum amount',
    'dash.invest.confirmInvest': 'Confirm Investment',
    'dash.invest.dailyReturn': 'Daily Return',
    'dash.invest.totalReturn': 'Total Return',
    'dash.invest.paymentMethod': 'Payment Method',
    'dash.invest.depositAddress': 'Deposit Address',
    'dash.invest.sendUsdt': 'Send USDT',

    'dash.plans.title': 'My Plans',
    'dash.plans.subtitle': 'Track your active investments',
    'dash.plans.noPlans': 'You have no active plans. Start investing!',
    'dash.plans.progress': 'Progress',
    'dash.plans.earned': 'Earned',
    'dash.plans.daysLeft': 'Days left',

    'dash.withdrawals.title': 'Withdrawals',
    'dash.withdrawals.subtitle': 'Request and manage your withdrawals',
    'dash.withdrawals.amount': 'Amount',
    'dash.withdrawals.walletAddress': 'Wallet Address',
    'dash.withdrawals.requestWithdrawal': 'Request Withdrawal',
    'dash.withdrawals.history': 'Withdrawal History',
    'dash.withdrawals.minWithdrawal': 'Minimum withdrawal',
    'dash.withdrawals.noWithdrawals': 'No withdrawals registered.',
    'dash.withdrawals.fee': 'Fee',
    'dash.withdrawals.netAmount': 'Net amount',

    'dash.affiliate.title': 'Affiliate Program',
    'dash.affiliate.subtitle': 'Invite and earn commissions',
    'dash.affiliate.referralLink': 'Referral Link',
    'dash.affiliate.copyLink': 'Copy Link',
    'dash.affiliate.directReferrals': 'Direct Referrals',
    'dash.affiliate.commissionHistory': 'Commission History',
    'dash.affiliate.totalCommission': 'Total Commission',
    'dash.affiliate.level': 'Level',

    'dash.team.title': 'Team Bonus',
    'dash.team.subtitle': 'Reach goals and earn additional bonuses',
    'dash.team.currentTier': 'Current Tier',
    'dash.team.nextTier': 'Next Tier',
    'dash.team.referralsNeeded': 'Referrals needed',
    'dash.team.bonusOnRoi': 'Bonus on ROI',

    // Dashboard - Transfer
    'dash.transfer.title': 'Transfer',
    'dash.transfer.subtitle': 'Send USDT to another platform user',
    'dash.transfer.recipientEmail': 'Recipient email',
    'dash.transfer.recipientEmailPlaceholder': 'user@email.com',
    'dash.transfer.lookupUser': 'Lookup',
    'dash.transfer.foundUser': 'User found',
    'dash.transfer.userNotFound': 'User not found',
    'dash.transfer.amount': 'Amount',
    'dash.transfer.amountPlaceholder': '0.00',
    'dash.transfer.fee': 'Fee',
    'dash.transfer.netAmount': 'Net amount',
    'dash.transfer.totalDebit': 'Total debit',
    'dash.transfer.sendTransfer': 'Send Transfer',
    'dash.transfer.config': 'Configuration',
    'dash.transfer.minAmount': 'Minimum amount',
    'dash.transfer.maxAmount': 'Maximum amount',
    'dash.transfer.feePct': 'Fee',
    'dash.transfer.dailyLimit': 'Daily limit',
    'dash.transfer.cooldown': 'Cooldown between transfers',
    'dash.transfer.enabled': 'Enabled',
    'dash.transfer.disabled': 'Disabled',
    'dash.transfer.history': 'Transfer history',
    'dash.transfer.noTransfers': 'No transfers registered.',
    'dash.transfer.sent': 'Sent',
    'dash.transfer.received': 'Received',
    'dash.transfer.completed': 'Completed',
    'dash.transfer.transferSuccess': 'Transfer sent successfully!',
    'dash.transfer.dailyUsed': 'Used today',
    'dash.transfer.cooldownRemaining': 'Cooldown remaining',

    'admin.dashboard': 'Admin Dashboard',
    'admin.plans': 'Plans',
    'admin.copyTraders': 'Copy Traders',
    'admin.pools': 'Pools',
    'admin.users': 'Users',
    'admin.withdrawals': 'Withdrawals',
    'admin.settings': 'Settings',
    'admin.affiliateLevels': 'Affiliate Levels',
    'admin.ranks': 'Ranks',
    'admin.nowpayments': 'NowPayments',
    'admin.totalUsers': 'Total Users',
    'admin.totalInvested': 'Total Invested',
    'admin.totalRoiDistributed': 'ROI Distributed',
    'admin.pendingWithdrawals': 'Pending Withdrawals',

    'nowpayments.deposit': 'Deposit',
    'nowpayments.withdraw': 'Withdraw',
    'nowpayments.status': 'Status',
    'nowpayments.waiting': 'Waiting for payment',
    'nowpayments.confirming': 'Confirming',
    'nowpayments.sending': 'Sending',
    'nowpayments.finished': 'Completed',
    'nowpayments.failed': 'Failed',
    'nowpayments.expired': 'Expired',
    'nowpayments.refunded': 'Refunded',
    'nowpayments.network': 'Network',
    'nowpayments.address': 'Address',
    'nowpayments.amount': 'Amount',
    'nowpayments.scanQr': 'Scan QR',
    'nowpayments.sendExact': 'Send exactly this amount to the address',
  },

  'pt-BR': {
    'general.invest': 'Investir',
    'general.withdraw': 'Sacar',
    'general.balance': 'Saldo',
    'general.usdt': 'USDT',
    'general.daily': 'Diário',
    'general.monthly': 'Mensal',
    'general.perDay': '/dia',
    'general.total': 'Total',
    'general.active': 'Ativo',
    'general.completed': 'Concluído',
    'general.pending': 'Pendente',
    'general.cancelled': 'Cancelado',
    'general.approved': 'Aprovado',
    'general.rejected': 'Rejeitado',
    'general.processed': 'Processado',
    'general.save': 'Salvar',
    'general.cancel': 'Cancelar',
    'general.delete': 'Excluir',
    'general.edit': 'Editar',
    'general.create': 'Criar',
    'general.search': 'Buscar',
    'general.filter': 'Filtrar',
    'general.loading': 'Carregando...',
    'general.success': 'Sucesso',
    'general.error': 'Erro',
    'general.yes': 'Sim',
    'general.no': 'Não',
    'general.close': 'Fechar',
    'general.back': 'Voltar',
    'general.next': 'Próximo',
    'general.previous': 'Anterior',
    'general.showMore': 'Ver mais',
    'general.showLess': 'Ver menos',

    'auth.login': 'Entrar',
    'auth.register': 'Cadastrar',
    'auth.logout': 'Sair',
    'auth.email': 'E-mail',
    'auth.password': 'Senha',
    'auth.name': 'Nome completo',
    'auth.phone': 'Telefone',
    'auth.confirmPassword': 'Confirmar senha',
    'auth.referralCode': 'Código de indicação',
    'auth.forgotPassword': 'Esqueceu a senha?',
    'auth.noAccount': 'Não tem conta?',
    'auth.hasAccount': 'Já tem conta?',
    'auth.loginTitle': 'Bem-vindo de volta',
    'auth.registerTitle': 'Crie sua conta',
    'auth.loginSubtitle': 'Acesse seu painel de investimento',
    'auth.registerSubtitle': 'Comece a ganhar com Copy Trading',

    'landing.nav.plans': 'Planos',
    'landing.nav.traders': 'Traders',
    'landing.nav.affiliate': 'Afiliados',
    'landing.nav.howItWorks': 'Como Funciona',
    'landing.nav.faq': 'FAQ',
    'landing.nav.login': 'Entrar',
    'landing.nav.register': 'Cadastrar',

    'landing.hero.badge': 'Copy Trading Automatizado com IA',
    'landing.hero.title': 'ActionCash',
    'landing.hero.subtitle': 'Copy Trading Automatizado',
    'landing.hero.description': 'Ganhe até <bold>3.3% de ROI diário</bold> com Copy Trading Automatizado. Invista em USDT e receba rendimentos diários automáticos.',
    'landing.hero.cta': 'Começar Agora',
    'landing.hero.viewPlans': 'Ver Planos',
    'landing.hero.statRoi': '+$2.5M',
    'landing.hero.statInvestors': '15K+',
    'landing.hero.statWinRate': '89%',
    'landing.hero.statRoiLabel': 'ROI Distribuído',
    'landing.hero.statInvestorsLabel': 'Investidores',
    'landing.hero.statWinRateLabel': 'Win Rate',

    'landing.how.title': 'Como <em>Funciona</em>',
    'landing.how.subtitle': 'Três passos simples para começar a ganhar com Copy Trading',
    'landing.how.step1Title': 'Escolha seu Plano',
    'landing.how.step1Desc': 'Selecione o plano ideal para o seu perfil de investimento',
    'landing.how.step2Title': 'Invista com USDT',
    'landing.how.step2Desc': 'Faça seu investimento em USDT de forma segura e rápida',
    'landing.how.step3Title': 'Receba ROI Diário',
    'landing.how.step3Desc': 'Ganhe retorno diário automático direto na sua conta',
    'landing.how.step': 'Passo',

    'landing.plans.title': 'Planos de <em>Investimento</em>',
    'landing.plans.subtitle': 'Escolha o plano que melhor se adapta ao seu perfil',
    'landing.plans.investment': 'Investimento',
    'landing.plans.dailyRoi': 'ROI Diário',
    'landing.plans.duration': 'Duração',
    'landing.plans.estimatedReturn': 'Retorno Estimado',
    'landing.plans.investNow': 'Investir Agora',
    'landing.plans.days': 'dias',
    'landing.plans.popular': 'Popular',
    'landing.plans.premium': 'Premium',

    'landing.traders.title': '<em>Copy Traders</em> em Destaque',
    'landing.traders.subtitle': 'Acompanhe os melhores traders e copie suas estratégias automaticamente',
    'landing.traders.winRate': 'Win Rate',
    'landing.traders.monthlyRoi': 'ROI Mensal',
    'landing.traders.risk': 'Risco',
    'landing.traders.riskLow': 'Baixo',
    'landing.traders.riskMedium': 'Médio',
    'landing.traders.riskHigh': 'Alto',
    'landing.traders.viewAll': 'Ver Todos',

    'landing.affiliate.title': 'Programa de <em>Afiliados</em>',
    'landing.affiliate.subtitle': 'Plano Carreira Unilevel - 6 Níveis de Comissões',
    'landing.affiliate.commissionByLevel': 'Comissões por Nível',
    'landing.affiliate.teamBonus': 'Bônus de Equipe',
    'landing.affiliate.directReferrals': 'indicações diretas ativas',
    'landing.affiliate.additionalDailyRoi': 'Bônus adicional no ROI diário',
    'landing.affiliate.level': 'Nível',
    'landing.affiliate.startEarning': 'Começar a Ganhar',
    'landing.affiliate.cta': 'Começar a Ganhar',

    // Landing - Team Bonus (ActionCash)
    'landing.teamBonus.title': 'Bônus de Equipe ActionCash',
    'landing.teamBonus.subtitle': '4 programas exclusivos para multiplicar seus ganhos com seu time',
    'landing.teamBonus.salary': 'Salário Semanal',
    'landing.teamBonus.salaryDesc': 'do capital ativo do seu time',
    'landing.teamBonus.minTeam': 'Mín. time',
    'landing.teamBonus.sundays': 'Pago todo domingo',
    'landing.teamBonus.gold': 'Action Gold',
    'landing.teamBonus.goldDesc': 'do salário semanal dos seus diretos',
    'landing.teamBonus.daymond': 'Action Daymond',
    'landing.teamBonus.daymondDesc': 'Pacote com ROI diário de 3.3%',
    'landing.teamBonus.renewable': 'Renovável',
    'landing.teamBonus.daymondPremium': 'Daymond Premium',
    'landing.teamBonus.daymondPremiumDesc': 'Pacote premium com ROI diário de 3.3%',
    'landing.teamBonus.dailyCap': 'Cap diário',
    'landing.unilevel.inLevels': 'em {n} níveis',
    'landing.unilevel.title': 'Programa de <em>Afiliados</em>',
    'landing.unilevel.subtitle': 'Ganhe comissões em 6 níveis com nosso plano Unilevel',
    'landing.unilevel.level': 'Nível',
    'landing.unilevel.total': 'Total',

    // Landing - Badges
    'landing.badges.copyTrading': 'Plataforma de Copy Trading',
    'landing.badges.liveDashboard': 'Painel de Trading ao Vivo',
    'landing.badges.portfolioValue': 'Valor do Portfólio',
    'landing.badges.winRate': 'Taxa de Acerto',
    'landing.badges.trading': 'Trading',
    'landing.badges.dailyRoi': 'ROI Diário',
    'landing.badges.simplePowerful': 'Simples e Poderoso',
    'landing.badges.step': 'PASSO',
    'landing.badges.topTraders': 'Top Traders',
    'landing.badges.dailyRoiTag': 'RENDIMENTO DIÁRIO',
    'landing.badges.careerPlan': 'PLANO DE CARREIRA',
    'landing.badges.teamRewards': 'RECOMPENSAS DE EQUIPE',
    'landing.badges.referralProgram': 'PROGRAMA DE AFILIADOS',
    'landing.badges.live': 'AO VIVO',
    'landing.badges.popular': 'POPULAR',

    // Landing - Career Plan
    'landing.career.title': 'Plano de <em>Carreira</em>',
    'landing.career.subtitle': 'Escale seu time e desbloqueie bonificações exclusivas em cada nível',
    'landing.career.progression': 'Progressão de Carreira',
    'landing.career.unlockNext': 'Desbloqueie o próximo nível',

    'landing.faq.title': 'Perguntas <em>Frequentes</em>',
    'landing.faq.subtitle': 'Tire suas dúvidas sobre a plataforma',
    'landing.faq.q1': 'O que é Copy Trading?',
    'landing.faq.a1': 'Copy Trading é uma forma de investimento onde você copia automaticamente as operações de traders profissionais. Na ActionCash, nossos traders experientes realizam operações e você recebe o ROI diário automaticamente.',
    'landing.faq.q2': 'Como funciona o ROI diário?',
    'landing.faq.a2': 'O ROI diário é calculado com base no plano escolhido. Por exemplo, no plano Silver (2.5% ao dia), um investimento de $100 gera $2.50 por dia. O rendimento é creditado automaticamente na sua conta.',
    'landing.faq.q3': 'Qual o valor mínimo para investir?',
    'landing.faq.a3': 'O valor mínimo é de $5 USDT. Com o ROI diário de 3.3%, você pode começar a ganhar desde o primeiro dia. Além disso, acesse os Bônus de Equipe ActionCash conforme seu time cresça.',
    'landing.faq.q4': 'Como faço saques?',
    'landing.faq.a4': 'Você pode solicitar saque a qualquer momento pelo painel. O mínimo para saque é de $10 USDT. Os saques são processados em até 24 horas úteis, sem taxa.',
    'landing.faq.q5': 'O programa de afiliados funciona como?',
    'landing.faq.a5': 'Nosso programa Unilevel possui 6 níveis de comissões: N1=5%, N2=3%, N3=1%, N4=1%, N5=1%, N6=2% (total 13%). Além disso, acesse os Bônus de Equipe: Salário Semanal, Action Gold, Action Daymond e Daymond Premium conforme o capital do seu time.',
    'landing.faq.q6': 'É seguro investir?',
    'landing.faq.a6': 'Utilizamos estratégias de trading testadas com win rate de 89%. Nosso sistema opera com stop loss e gerenciamento de risco. No entanto, todo investimento envolve riscos e rentabilidade passada não garante resultados futuros.',
    'landing.faq.q7': 'Quais as formas de pagamento?',
    'landing.faq.a7': 'Atualmente aceitamos USDT (Tether) na rede TRC-20. É uma stablecoin atrelada ao dólar, garantindo estabilidade no valor.',

    'landing.footer.brand': 'ActionCash',
    'landing.footer.description': 'Copy Trading Automatizado com ROI diário. Invista em USDT e ganhe rendimentos automáticos.',
    'landing.footer.platform': 'Plataforma',
    'landing.footer.support': 'Suporte',
    'landing.footer.community': 'Comunidade',
    'landing.footer.helpCenter': 'Central de Ajuda',
    'landing.footer.terms': 'Termos de Uso',
    'landing.footer.privacy': 'Política de Privacidade',
    'landing.footer.contact': 'Contato',
    'landing.footer.rights': 'Todos os direitos reservados.',
    'landing.footer.disclaimer': 'Todo investimento envolve riscos. Rentabilidade passada não garante resultados futuros.',

    'dash.sidebar.overview': 'Visão Geral',
    'dash.sidebar.invest': 'Investir',
    'dash.sidebar.myPlans': 'Meus Planos',
    'dash.sidebar.copyTraders': 'Copy Traders',
    'dash.sidebar.affiliate': 'Afiliados',
    'dash.sidebar.teamBonus': 'Bônus Equipe',
    'dash.sidebar.withdrawals': 'Saques',
    'dash.sidebar.transfer': 'Transferência',
    'dash.sidebar.admin': 'Admin',

    'dash.overview.welcome': 'Olá',
    'dash.overview.welcomeSubtitle': 'Aqui está o resumo da sua conta',
    'dash.overview.availableBalance': 'Saldo Disponível',
    'dash.overview.totalInvested': 'Total Investido',
    'dash.overview.totalRoi': 'ROI Total',
    'dash.overview.activeInvestments': 'Investimentos Ativos',
    'dash.overview.totalWithdrawals': 'Saques Totais',
    'dash.overview.roiChart': 'ROI dos Últimos 7 Dias (%)',
    'dash.overview.quickActions': 'Ações Rápidas',
    'dash.overview.recentTransactions': 'Transações Recentes',

    'dash.invest.title': 'Investir',
    'dash.invest.subtitle': 'Selecione um plano e realize seu investimento',
    'dash.invest.selectPlan': 'Selecionar Plano',
    'dash.invest.amount': 'Valor',
    'dash.invest.minAmount': 'Valor mínimo',
    'dash.invest.maxAmount': 'Valor máximo',
    'dash.invest.confirmInvest': 'Confirmar Investimento',
    'dash.invest.dailyReturn': 'Retorno Diário',
    'dash.invest.totalReturn': 'Retorno Total',
    'dash.invest.paymentMethod': 'Método de Pagamento',
    'dash.invest.depositAddress': 'Endereço de Depósito',
    'dash.invest.sendUsdt': 'Enviar USDT',

    'dash.plans.title': 'Meus Planos',
    'dash.plans.subtitle': 'Acompanhamento dos seus investimentos ativos',
    'dash.plans.noPlans': 'Você não tem planos ativos. Comece a investir!',
    'dash.plans.progress': 'Progresso',
    'dash.plans.earned': 'Ganho',
    'dash.plans.daysLeft': 'Dias restantes',

    'dash.withdrawals.title': 'Saques',
    'dash.withdrawals.subtitle': 'Solicite e gerencie seus saques',
    'dash.withdrawals.amount': 'Valor',
    'dash.withdrawals.walletAddress': 'Endereço da Wallet',
    'dash.withdrawals.requestWithdrawal': 'Solicitar Saque',
    'dash.withdrawals.history': 'Histórico de Saques',
    'dash.withdrawals.minWithdrawal': 'Saque mínimo',
    'dash.withdrawals.noWithdrawals': 'Nenhum saque registrado.',
    'dash.withdrawals.fee': 'Taxa',
    'dash.withdrawals.netAmount': 'Valor líquido',

    'dash.affiliate.title': 'Programa de Afiliados',
    'dash.affiliate.subtitle': 'Convide e ganhe comissões',
    'dash.affiliate.referralLink': 'Link de Indicação',
    'dash.affiliate.copyLink': 'Copiar Link',
    'dash.affiliate.directReferrals': 'Indicações Diretas',
    'dash.affiliate.commissionHistory': 'Histórico de Comissões',
    'dash.affiliate.totalCommission': 'Comissão Total',
    'dash.affiliate.level': 'Nível',

    'dash.team.title': 'Bônus de Equipe',
    'dash.team.subtitle': 'Alcance metas e ganhe bônus adicionais',
    'dash.team.currentTier': 'Nível Atual',
    'dash.team.nextTier': 'Próximo Nível',
    'dash.team.referralsNeeded': 'Indicações necessárias',
    'dash.team.bonusOnRoi': 'Bônus no ROI',

    // Dashboard - Transfer
    'dash.transfer.title': 'Transferência',
    'dash.transfer.subtitle': 'Envie USDT para outro usuário da plataforma',
    'dash.transfer.recipientEmail': 'E-mail do destinatário',
    'dash.transfer.recipientEmailPlaceholder': 'usuario@email.com',
    'dash.transfer.lookupUser': 'Buscar',
    'dash.transfer.foundUser': 'Usuário encontrado',
    'dash.transfer.userNotFound': 'Usuário não encontrado',
    'dash.transfer.amount': 'Valor',
    'dash.transfer.amountPlaceholder': '0.00',
    'dash.transfer.fee': 'Taxa',
    'dash.transfer.netAmount': 'Valor líquido',
    'dash.transfer.totalDebit': 'Débito total',
    'dash.transfer.sendTransfer': 'Enviar Transferência',
    'dash.transfer.config': 'Configuração',
    'dash.transfer.minAmount': 'Valor mínimo',
    'dash.transfer.maxAmount': 'Valor máximo',
    'dash.transfer.feePct': 'Taxa',
    'dash.transfer.dailyLimit': 'Limite diário',
    'dash.transfer.cooldown': 'Espera entre transferências',
    'dash.transfer.enabled': 'Habilitado',
    'dash.transfer.disabled': 'Desabilitado',
    'dash.transfer.history': 'Histórico de transferências',
    'dash.transfer.noTransfers': 'Nenhuma transferência registrada.',
    'dash.transfer.sent': 'Enviado',
    'dash.transfer.received': 'Recebido',
    'dash.transfer.completed': 'Concluído',
    'dash.transfer.transferSuccess': 'Transferência enviada com sucesso!',
    'dash.transfer.dailyUsed': 'Usados hoje',
    'dash.transfer.cooldownRemaining': 'Espera restante',

    'admin.dashboard': 'Dashboard Admin',
    'admin.plans': 'Planos',
    'admin.copyTraders': 'Copy Traders',
    'admin.pools': 'Pools',
    'admin.users': 'Usuários',
    'admin.withdrawals': 'Saques',
    'admin.settings': 'Configurações',
    'admin.affiliateLevels': 'Níveis Afiliado',
    'admin.ranks': 'Ranks',
    'admin.nowpayments': 'NowPayments',
    'admin.totalUsers': 'Total Usuários',
    'admin.totalInvested': 'Total Investido',
    'admin.totalRoiDistributed': 'ROI Distribuído',
    'admin.pendingWithdrawals': 'Saques Pendentes',

    'nowpayments.deposit': 'Depositar',
    'nowpayments.withdraw': 'Sacar',
    'nowpayments.status': 'Status',
    'nowpayments.waiting': 'Aguardando pagamento',
    'nowpayments.confirming': 'Confirmando',
    'nowpayments.sending': 'Enviando',
    'nowpayments.finished': 'Concluído',
    'nowpayments.failed': 'Falhou',
    'nowpayments.expired': 'Expirado',
    'nowpayments.refunded': 'Reembolsado',
    'nowpayments.network': 'Rede',
    'nowpayments.address': 'Endereço',
    'nowpayments.amount': 'Valor',
    'nowpayments.scanQr': 'Escaneie o QR',
    'nowpayments.sendExact': 'Envie exatamente este valor para o endereço',
  },

  zh: {
    'general.invest': '投资',
    'general.withdraw': '提现',
    'general.balance': '余额',
    'general.usdt': 'USDT',
    'general.daily': '每日',
    'general.monthly': '每月',
    'general.perDay': '/天',
    'general.total': '总计',
    'general.active': '活跃',
    'general.completed': '已完成',
    'general.pending': '待处理',
    'general.cancelled': '已取消',
    'general.approved': '已批准',
    'general.rejected': '已拒绝',
    'general.processed': '已处理',
    'general.save': '保存',
    'general.cancel': '取消',
    'general.delete': '删除',
    'general.edit': '编辑',
    'general.create': '创建',
    'general.search': '搜索',
    'general.filter': '筛选',
    'general.loading': '加载中...',
    'general.success': '成功',
    'general.error': '错误',
    'general.yes': '是',
    'general.no': '否',
    'general.close': '关闭',
    'general.back': '返回',
    'general.next': '下一步',
    'general.previous': '上一步',
    'general.showMore': '查看更多',
    'general.showLess': '收起',

    'auth.login': '登录',
    'auth.register': '注册',
    'auth.logout': '退出',
    'auth.email': '邮箱',
    'auth.password': '密码',
    'auth.name': '全名',
    'auth.phone': '电话',
    'auth.confirmPassword': '确认密码',
    'auth.referralCode': '推荐码',
    'auth.forgotPassword': '忘记密码？',
    'auth.noAccount': '没有账号？',
    'auth.hasAccount': '已有账号？',
    'auth.loginTitle': '欢迎回来',
    'auth.registerTitle': '创建账号',
    'auth.loginSubtitle': '访问您的投资面板',
    'auth.registerSubtitle': '开始通过跟单交易赚钱',

    'landing.nav.plans': '计划',
    'landing.nav.traders': '交易员',
    'landing.nav.affiliate': '联盟',
    'landing.nav.howItWorks': '运作方式',
    'landing.nav.faq': '常见问题',
    'landing.nav.login': '登录',
    'landing.nav.register': '注册',

    'landing.hero.badge': 'AI驱动的自动跟单交易',
    'landing.hero.title': 'ActionCash',
    'landing.hero.subtitle': '自动跟单交易',
    'landing.hero.description': '通过自动跟单交易赚取高达<bold>3.3%的每日ROI</bold>。投资USDT，获得自动每日收益。',
    'landing.hero.cta': '立即开始',
    'landing.hero.viewPlans': '查看计划',
    'landing.hero.statRoi': '+$2.5M',
    'landing.hero.statInvestors': '15K+',
    'landing.hero.statWinRate': '89%',
    'landing.hero.statRoiLabel': '已分配ROI',
    'landing.hero.statInvestorsLabel': '投资者',
    'landing.hero.statWinRateLabel': '胜率',

    'landing.how.title': '运作<em>方式</em>',
    'landing.how.subtitle': '三个简单步骤开始通过跟单交易赚钱',
    'landing.how.step1Title': '选择计划',
    'landing.how.step1Desc': '选择适合您投资配置的理想计划',
    'landing.how.step2Title': '用USDT投资',
    'landing.how.step2Desc': '安全快速地用USDT进行投资',
    'landing.how.step3Title': '获取每日ROI',
    'landing.how.step3Desc': '自动获得每日收益，直接到账',
    'landing.how.step': '步骤',

    'landing.plans.title': '投资<em>计划</em>',
    'landing.plans.subtitle': '选择最适合您的计划',
    'landing.plans.investment': '投资额',
    'landing.plans.dailyRoi': '每日ROI',
    'landing.plans.duration': '期限',
    'landing.plans.estimatedReturn': '预估回报',
    'landing.plans.investNow': '立即投资',
    'landing.plans.days': '天',
    'landing.plans.popular': '热门',
    'landing.plans.premium': '高级',

    'landing.traders.title': '精选<em>跟单交易员</em>',
    'landing.traders.subtitle': '关注最佳交易员，自动复制他们的策略',
    'landing.traders.winRate': '胜率',
    'landing.traders.monthlyRoi': '月ROI',
    'landing.traders.risk': '风险',
    'landing.traders.riskLow': '低',
    'landing.traders.riskMedium': '中',
    'landing.traders.riskHigh': '高',
    'landing.traders.viewAll': '查看全部',

    'landing.affiliate.title': '联盟<em>计划</em>',
    'landing.affiliate.subtitle': '单层职业计划 - 6级佣金',
    'landing.affiliate.commissionByLevel': '各级佣金',
    'landing.affiliate.teamBonus': '团队奖金',
    'landing.affiliate.directReferrals': '活跃直接推荐',
    'landing.affiliate.additionalDailyRoi': '每日ROI额外奖金',
    'landing.affiliate.level': '级别',
    'landing.affiliate.startEarning': '开始赚钱',
    'landing.affiliate.cta': '开始赚钱',

    // Landing - Team Bonus (ActionCash)
    'landing.teamBonus.title': 'ActionCash团队奖金',
    'landing.teamBonus.subtitle': '4个专属计划，与团队一起倍增收益',
    'landing.teamBonus.salary': '周薪',
    'landing.teamBonus.salaryDesc': '团队活跃资金',
    'landing.teamBonus.minTeam': '最低团队',
    'landing.teamBonus.sundays': '每周日发放',
    'landing.teamBonus.gold': 'Action Gold',
    'landing.teamBonus.goldDesc': '直推周薪的分成',
    'landing.teamBonus.daymond': 'Action Daymond',
    'landing.teamBonus.daymondDesc': '3.3%日ROI套餐',
    'landing.teamBonus.renewable': '可续期',
    'landing.teamBonus.daymondPremium': 'Daymond高级版',
    'landing.teamBonus.daymondPremiumDesc': '3.3%日ROI高级套餐',
    'landing.teamBonus.dailyCap': '每日上限',
    'landing.unilevel.inLevels': '{n}个级别',
    'landing.unilevel.title': '联盟<em>计划</em>',
    'landing.unilevel.subtitle': '通过我们的Unilevel计划在6个级别赚取佣金',
    'landing.unilevel.level': '级别',
    'landing.unilevel.total': '总计',

    // Landing - Badges
    'landing.badges.copyTrading': '跟单交易平台',
    'landing.badges.liveDashboard': '实时交易面板',
    'landing.badges.portfolioValue': '投资组合价值',
    'landing.badges.winRate': '胜率',
    'landing.badges.trading': '交易',
    'landing.badges.dailyRoi': '每日ROI',
    'landing.badges.simplePowerful': '简单而强大',
    'landing.badges.step': '步骤',
    'landing.badges.topTraders': '顶级交易员',
    'landing.badges.dailyRoiTag': '每日收益',
    'landing.badges.careerPlan': '职业计划',
    'landing.badges.teamRewards': '团队奖励',
    'landing.badges.referralProgram': '推荐计划',
    'landing.badges.live': '实时',
    'landing.badges.popular': '热门',

    // Landing - Career Plan
    'landing.career.title': '职业<em>规划</em>',
    'landing.career.subtitle': '扩展团队，在每个级别解锁专属奖金',
    'landing.career.progression': '职业发展路径',
    'landing.career.unlockNext': '解锁下一级别',

    'landing.faq.title': '常见<em>问题</em>',
    'landing.faq.subtitle': '解答您关于平台的疑问',
    'landing.faq.q1': '什么是跟单交易？',
    'landing.faq.a1': '跟单交易是一种自动复制专业交易员操作的投资方式。在ActionCash，我们经验丰富的交易员执行交易，您自动获得每日ROI。',
    'landing.faq.q2': '每日ROI如何运作？',
    'landing.faq.a2': '每日ROI根据所选计划计算。例如，在Silver计划（每日2.5%），$100的投资每天产生$2.50。收益自动记入您的账户。',
    'landing.faq.q3': '最低投资金额是多少？',
    'landing.faq.a3': '最低金额为$5 USDT。每日ROI为3.3%，您可以从第一天开始获利。随着团队增长，还可解锁ActionCash团队奖金。',
    'landing.faq.q4': '如何提现？',
    'landing.faq.a4': '您可以随时从面板申请提现。最低提现金额为$10 USDT。提现在24个工作小时内处理，免手续费。',
    'landing.faq.q5': '联盟计划如何运作？',
    'landing.faq.a5': '我们的单层计划有6个佣金级别：L1=5%, L2=3%, L3=1%, L4=1%, L5=1%, L6=2%（总计13%）。此外，根据团队资金可解锁团队奖金：周薪、Action Gold、Action Daymond和Daymond Premium。',
    'landing.faq.q6': '投资安全吗？',
    'landing.faq.a6': '我们使用经过验证的89%胜率的交易策略。我们的系统采用止损和风险管理。然而，所有投资都涉及风险，过往表现不保证未来结果。',
    'landing.faq.q7': '有哪些支付方式？',
    'landing.faq.a7': '目前我们接受TRC-20网络上的USDT（泰达币）。它是一种与美元挂钩的稳定币，确保价值稳定。',

    'landing.footer.brand': 'ActionCash',
    'landing.footer.description': '自动跟单交易，每日ROI。投资USDT，获取自动收益。',
    'landing.footer.platform': '平台',
    'landing.footer.support': '支持',
    'landing.footer.community': '社区',
    'landing.footer.helpCenter': '帮助中心',
    'landing.footer.terms': '使用条款',
    'landing.footer.privacy': '隐私政策',
    'landing.footer.contact': '联系我们',
    'landing.footer.rights': '版权所有。',
    'landing.footer.disclaimer': '所有投资都涉及风险。过往表现不保证未来结果。',

    'dash.sidebar.overview': '概览',
    'dash.sidebar.invest': '投资',
    'dash.sidebar.myPlans': '我的计划',
    'dash.sidebar.copyTraders': '跟单交易员',
    'dash.sidebar.affiliate': '联盟',
    'dash.sidebar.teamBonus': '团队奖金',
    'dash.sidebar.withdrawals': '提现',
    'dash.sidebar.transfer': '转账',
    'dash.sidebar.admin': '管理',

    'dash.overview.welcome': '你好',
    'dash.overview.welcomeSubtitle': '这是您的账户概览',
    'dash.overview.availableBalance': '可用余额',
    'dash.overview.totalInvested': '总投资',
    'dash.overview.totalRoi': '总ROI',
    'dash.overview.activeInvestments': '活跃投资',
    'dash.overview.totalWithdrawals': '总提现',
    'dash.overview.roiChart': '近7天ROI (%)',
    'dash.overview.quickActions': '快速操作',
    'dash.overview.recentTransactions': '近期交易',

    'dash.invest.title': '投资',
    'dash.invest.subtitle': '选择计划并进行投资',
    'dash.invest.selectPlan': '选择计划',
    'dash.invest.amount': '金额',
    'dash.invest.minAmount': '最低金额',
    'dash.invest.maxAmount': '最高金额',
    'dash.invest.confirmInvest': '确认投资',
    'dash.invest.dailyReturn': '每日回报',
    'dash.invest.totalReturn': '总回报',
    'dash.invest.paymentMethod': '支付方式',
    'dash.invest.depositAddress': '充值地址',
    'dash.invest.sendUsdt': '发送USDT',

    'dash.plans.title': '我的计划',
    'dash.plans.subtitle': '追踪您的活跃投资',
    'dash.plans.noPlans': '您没有活跃计划。开始投资吧！',
    'dash.plans.progress': '进度',
    'dash.plans.earned': '已赚取',
    'dash.plans.daysLeft': '剩余天数',

    'dash.withdrawals.title': '提现',
    'dash.withdrawals.subtitle': '申请和管理提现',
    'dash.withdrawals.amount': '金额',
    'dash.withdrawals.walletAddress': '钱包地址',
    'dash.withdrawals.requestWithdrawal': '申请提现',
    'dash.withdrawals.history': '提现记录',
    'dash.withdrawals.minWithdrawal': '最低提现',
    'dash.withdrawals.noWithdrawals': '暂无提现记录。',
    'dash.withdrawals.fee': '手续费',
    'dash.withdrawals.netAmount': '净额',

    'dash.affiliate.title': '联盟计划',
    'dash.affiliate.subtitle': '邀请并赚取佣金',
    'dash.affiliate.referralLink': '推荐链接',
    'dash.affiliate.copyLink': '复制链接',
    'dash.affiliate.directReferrals': '直接推荐',
    'dash.affiliate.commissionHistory': '佣金记录',
    'dash.affiliate.totalCommission': '总佣金',
    'dash.affiliate.level': '级别',

    'dash.team.title': '团队奖金',
    'dash.team.subtitle': '达成目标获取额外奖金',
    'dash.team.currentTier': '当前等级',
    'dash.team.nextTier': '下一等级',
    'dash.team.referralsNeeded': '所需推荐',
    'dash.team.bonusOnRoi': 'ROI奖金',

    // Dashboard - Transfer
    'dash.transfer.title': '转账',
    'dash.transfer.subtitle': '向平台其他用户发送USDT',
    'dash.transfer.recipientEmail': '收件人邮箱',
    'dash.transfer.recipientEmailPlaceholder': 'user@email.com',
    'dash.transfer.lookupUser': '查找',
    'dash.transfer.foundUser': '找到用户',
    'dash.transfer.userNotFound': '未找到用户',
    'dash.transfer.amount': '金额',
    'dash.transfer.amountPlaceholder': '0.00',
    'dash.transfer.fee': '手续费',
    'dash.transfer.netAmount': '净金额',
    'dash.transfer.totalDebit': '总扣款',
    'dash.transfer.sendTransfer': '发送转账',
    'dash.transfer.config': '配置',
    'dash.transfer.minAmount': '最低金额',
    'dash.transfer.maxAmount': '最高金额',
    'dash.transfer.feePct': '手续费率',
    'dash.transfer.dailyLimit': '每日限额',
    'dash.transfer.cooldown': '转账间隔',
    'dash.transfer.enabled': '已启用',
    'dash.transfer.disabled': '已禁用',
    'dash.transfer.history': '转账记录',
    'dash.transfer.noTransfers': '暂无转账记录。',
    'dash.transfer.sent': '已发送',
    'dash.transfer.received': '已收到',
    'dash.transfer.completed': '已完成',
    'dash.transfer.transferSuccess': '转账发送成功！',
    'dash.transfer.dailyUsed': '今日已用',
    'dash.transfer.cooldownRemaining': '剩余等待',

    'admin.dashboard': '管理面板',
    'admin.plans': '计划',
    'admin.copyTraders': '跟单交易员',
    'admin.pools': '资金池',
    'admin.users': '用户',
    'admin.withdrawals': '提现',
    'admin.settings': '设置',
    'admin.affiliateLevels': '联盟级别',
    'admin.ranks': '等级',
    'admin.nowpayments': 'NowPayments',
    'admin.totalUsers': '总用户',
    'admin.totalInvested': '总投资',
    'admin.totalRoiDistributed': '已分配ROI',
    'admin.pendingWithdrawals': '待处理提现',

    'nowpayments.deposit': '充值',
    'nowpayments.withdraw': '提现',
    'nowpayments.status': '状态',
    'nowpayments.waiting': '等待支付',
    'nowpayments.confirming': '确认中',
    'nowpayments.sending': '发送中',
    'nowpayments.finished': '已完成',
    'nowpayments.failed': '失败',
    'nowpayments.expired': '已过期',
    'nowpayments.refunded': '已退款',
    'nowpayments.network': '网络',
    'nowpayments.address': '地址',
    'nowpayments.amount': '金额',
    'nowpayments.scanQr': '扫描二维码',
    'nowpayments.sendExact': '请将精确金额发送至该地址',
  },
}
