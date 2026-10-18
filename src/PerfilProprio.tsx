import { BookOpen } from 'lucide-react';
import type { Livro, Perfil } from './dados/tipos';

interface Props {
  perfil: Perfil;
  publicados: Livro[];
  editar: () => void;
  abrirLivro: (id: string) => void;
}

export function PerfilProprio({ perfil, publicados, editar, abrirLivro }: Props) {
  return <section className="own-profile" aria-labelledby="own-profile-title">
    <header className="own-profile-heading">
      <span className="own-profile-avatar">{perfil.foto_url ? <img src={perfil.foto_url} alt="Sua foto de perfil" /> : perfil.nome_usuario.charAt(0).toUpperCase()}</span>
      <div className="own-profile-identity">
        <h1 id="own-profile-title">{perfil.nome_usuario}</h1>
        <p className="own-profile-handle">@{perfil.nome_usuario}</p>
        {perfil.bio?.trim() && <p className="own-profile-bio">{perfil.bio}</p>}
      </div>
      <button className="btn-secondary own-profile-edit" onClick={editar}>Editar perfil</button>
    </header>
    <section className="own-profile-publications" aria-labelledby="own-profile-publications-title">
      <h2 id="own-profile-publications-title" className="section-title">Publicados</h2>
      {publicados.length ? <div className="library-grid">{publicados.map((livro) => <article className="library-book" key={livro.id}>
        <button className="library-cover" aria-label={`Ver detalhes de ${livro.titulo}`} onClick={() => abrirLivro(livro.id)}>{livro.capa_url ? <img src={livro.capa_url} alt="" loading="lazy" /> : <span className="typographic-cover"><BookOpen size={24} aria-hidden="true" /><span>{livro.titulo}</span></span>}</button>
        <h3 className="own-profile-book-title"><button onClick={() => abrirLivro(livro.id)}>{livro.titulo}</button></h3>
      </article>)}</div> : <p className="shelf-empty">Você ainda não publicou nenhum livro.</p>}
    </section>
  </section>;
}
