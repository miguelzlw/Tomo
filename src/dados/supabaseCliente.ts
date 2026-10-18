// ==============================================================================
// Tomo — Cliente Supabase (Privado da Camada de Acesso a Dados)
// RNF-08: O resto do aplicativo NUNCA importa este arquivo diretamente.
// Todas as operações passam obrigatoriamente por src/dados/index.ts.
// ==============================================================================

import { createClient } from '@supabase/supabase-js';
import { validarConfiguracaoSupabase } from './supabaseConfiguracao';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const configuracao = validarConfiguracaoSupabase(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = configuracao.configurado;
export const erroConfiguracaoSupabase = configuracao.erro;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
