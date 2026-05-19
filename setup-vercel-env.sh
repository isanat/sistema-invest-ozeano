#!/bin/bash
# ============================================================================
# PLATAFORMA ROI - Script para configurar variáveis no Vercel
# ============================================================================
# Execute: ./setup-vercel-env.sh
# Pré-requisito: vercel CLI instalado e logado (vercel login)
# ============================================================================

PROJECT_NAME="sistema-invest-ozeano"

echo "🚀 Configurando variáveis de ambiente no Vercel para $PROJECT_NAME"
echo ""

# Verificar se vercel está instalado
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI não encontrado. Instale com: npm i -g vercel"
    exit 1
fi

# Link do projeto se necessário
echo "🔗 Linkando projeto..."
vercel link --yes

# NowPayments Configuration
echo ""
echo "📋 Adicionando variáveis NowPayments..."

read -p "NOWPAYMENTS_API_KEY: " NP_API_KEY
read -p "NOWPAYMENTS_EMAIL: " NP_EMAIL
read -s -p "NOWPAYMENTS_PASSWORD: " NP_PASSWORD
echo ""
read -p "NOWPAYMENTS_IPN_SECRET: " NP_IPN_SECRET
read -p "NOWPAYMENTS_2FA_SECRET: " NP_2FA_SECRET

# Database (Neon PostgreSQL)
echo ""
echo "📋 Adicionando variáveis de banco de dados..."
read -p "DATABASE_URL (Neon pooled): " DB_URL
read -p "DATABASE_URL_DIRECT (Neon direct, optional): " DB_URL_DIRECT

# Security
echo ""
echo "📋 Adicionando variáveis de segurança..."
JWT_SECRET=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 16)
echo "JWT_SECRET gerado automaticamente: $JWT_SECRET"
echo "CRON_SECRET gerado automaticamente: $CRON_SECRET"

# App config
NEXT_PUBLIC_APP_URL="https://sistema-invest-ozeano.vercel.app"

# Add all environment variables
echo ""
echo "⏳ Adicionando variáveis ao Vercel (ambiente: production)..."

vercel env add NOWPAYMENTS_API_KEY production <<< "$NP_API_KEY"
vercel env add NOWPAYMENTS_EMAIL production <<< "$NP_EMAIL"
vercel env add NOWPAYMENTS_PASSWORD production <<< "$NP_PASSWORD"
vercel env add NOWPAYMENTS_IPN_SECRET production <<< "$NP_IPN_SECRET"
vercel env add NOWPAYMENTS_2FA_SECRET production <<< "$NP_2FA_SECRET"
vercel env add NOWPAYMENTS_BASE_URL production <<< "https://api.nowpayments.io/v1"
vercel env add DATABASE_URL production <<< "$DB_URL"
vercel env add DATABASE_URL_DIRECT production <<< "$DB_URL_DIRECT"
vercel env add JWT_SECRET production <<< "$JWT_SECRET"
vercel env add CRON_SECRET production <<< "$CRON_SECRET"
vercel env add NEXT_PUBLIC_APP_URL production <<< "$NEXT_PUBLIC_APP_URL"

# Also add to preview and development
echo ""
echo "⏳ Adicionando também para preview e development..."
vercel env add NOWPAYMENTS_API_KEY preview <<< "$NP_API_KEY"
vercel env add NOWPAYMENTS_EMAIL preview <<< "$NP_EMAIL"
vercel env add NOWPAYMENTS_PASSWORD preview <<< "$NP_PASSWORD"
vercel env add NOWPAYMENTS_IPN_SECRET preview <<< "$NP_IPN_SECRET"
vercel env add NOWPAYMENTS_2FA_SECRET preview <<< "$NP_2FA_SECRET"
vercel env add NOWPAYMENTS_BASE_URL preview <<< "https://api.nowpayments.io/v1"
vercel env add DATABASE_URL preview <<< "$DB_URL"
vercel env add DATABASE_URL_DIRECT preview <<< "$DB_URL_DIRECT"
vercel env add JWT_SECRET preview <<< "$JWT_SECRET"
vercel env add CRON_SECRET preview <<< "$CRON_SECRET"
vercel env add NEXT_PUBLIC_APP_URL preview <<< "$NEXT_PUBLIC_APP_URL"

vercel env add NOWPAYMENTS_API_KEY development <<< "$NP_API_KEY"
vercel env add NOWPAYMENTS_EMAIL development <<< "$NP_EMAIL"
vercel env add NOWPAYMENTS_PASSWORD development <<< "$NP_PASSWORD"
vercel env add NOWPAYMENTS_IPN_SECRET development <<< "$NP_IPN_SECRET"
vercel env add NOWPAYMENTS_2FA_SECRET development <<< "$NP_2FA_SECRET"
vercel env add NOWPAYMENTS_BASE_URL development <<< "https://api.nowpayments.io/v1"
vercel env add DATABASE_URL development <<< "$DB_URL"
vercel env add DATABASE_URL_DIRECT development <<< "$DB_URL_DIRECT"
vercel env add JWT_SECRET development <<< "$JWT_SECRET"
vercel env add CRON_SECRET development <<< "$CRON_SECRET"
vercel env add NEXT_PUBLIC_APP_URL development <<< "$NEXT_PUBLIC_APP_URL"

echo ""
echo "✅ Todas as variáveis configuradas!"
echo ""
echo "🔄 Faça redeploy para aplicar as variáveis:"
echo "   vercel --prod"
echo ""
echo "📋 Variáveis configuradas:"
echo "   NOWPAYMENTS_API_KEY     ✅"
echo "   NOWPAYMENTS_EMAIL       ✅"
echo "   NOWPAYMENTS_PASSWORD    ✅"
echo "   NOWPAYMENTS_IPN_SECRET  ✅"
echo "   NOWPAYMENTS_2FA_SECRET  ✅"
echo "   NOWPAYMENTS_BASE_URL    ✅"
echo "   DATABASE_URL            ✅"
echo "   DATABASE_URL_DIRECT     ✅"
echo "   JWT_SECRET              ✅ (auto-gerado)"
echo "   CRON_SECRET             ✅ (auto-gerado)"
echo "   NEXT_PUBLIC_APP_URL     ✅"
