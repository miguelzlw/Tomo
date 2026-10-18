// ==============================================================================
// Tomo — Tipos do Domínio e Modelo de Dados
// Baseado na Seção 5, 6 e 7 do Documento Mestre de Requisitos
// ==============================================================================

export type PapelUsuario = 'usuario' | 'admin';
export type StatusPerfil = 'pendente' | 'aprovado' | 'bloqueado';

export interface Perfil {
  id: string; // uuid
  nome_usuario: string;
  foto_url?: string | null;
  bio?: string | null;
  papel: PapelUsuario;
  status: StatusPerfil;
  criado_em: string;
}

export type SituacaoLivro = 'rascunho' | 'lancado';
export type VisibilidadeLivro = 'privado' | 'amigos' | 'publico';

export interface Livro {
  id: string; // uuid
  autor_id: string;
  titulo: string;
  descricao?: string | null;
  capa_url?: string | null;
  fundo_url?: string | null;
  situacao: SituacaoLivro;
  visibilidade: VisibilidadeLivro;
  oculto_admin: boolean;
  lixeira?: boolean;
  criado_em: string;
  atualizado_em: string;
  // Campos enriquecidos para exibição quando carregado com join
  autor?: Perfil;
  total_paginas?: number;
}

export interface Pagina {
  id?: string;
  livro_id: string;
  numero: number;
  texto: string; // Máx. 1500 caracteres
}

export interface Seguidor {
  seguidor_id: string;
  seguido_id: string;
  criado_em: string;
}

export interface ProgressoLeitura {
  usuario_id: string;
  livro_id: string;
  pagina_numero: number;
  atualizado_em: string;
  livro?: Livro;
}

export interface LivroSalvo {
  usuario_id: string;
  livro_id: string;
  criado_em: string;
  livro?: Livro;
}

export type TipoNotificacao = 'novo_seguidor' | 'seguir_mutuo' | 'nova_conta_pendente';

export interface Notificacao {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacao;
  origem_id: string;
  lida: boolean;
  criado_em: string;
  origem_perfil?: Perfil;
}

export interface BuscaRecente {
  id: string;
  usuario_id: string;
  termo: string;
  tipo: 'livro' | 'perfil';
  criado_em: string;
}

export interface Sessao {
  id: string;
  usuario_id: string;
  entrada: string;
  ultimo_sinal: string;
  perfil?: Perfil;
}

export interface RespostaAuth {
  sucesso: boolean;
  mensagem?: string;
  perfil?: Perfil | null;
}
