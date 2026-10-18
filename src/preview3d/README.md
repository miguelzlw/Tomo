# Macaquinho do Tomo — estudo 01

Prévia visual em `/macaco-3d.html`. O mesmo modelo é usado na tela de login, em `../modelos/cenaMacacoLivro.ts`, com o livro e os gestos controlados por `../animacaoMacaco.ts`.

## Arquivos

- `../modelos/macaco3d.ts`: modelo procedural compartilhado com a tela de login, materiais e articulações.
- `viewer.ts`: câmera, iluminação, interação e exportação.
- `studio.css`: interface de revisão.
- `../../public/models/tomo-macaquinho-estudo-01.glb`: exportação inicial.

Execute `npm run model:export` na raiz para regenerar o GLB a partir do mesmo modelo mostrado no visualizador. O comando verifica vértices, pesos, contato com o chão e orçamento de geometria; exporta; reimporta o GLB e confere as transformações da animação.

O desenho existente do Tomo orienta o pelo castanho, a pele clara, as orelhas e o rabo curvado. O rosto é uma interpretação nova, pois a referência original mostra o personagem de costas. Não há modelos, texturas ou imagens baixados de terceiros.

## Contrato desta prévia

- Estado: **modelo procedural integrado à tela de login**, ainda sujeito a refinamento visual.
- Coordenadas: Y para cima, frente em +Z, pés no chão em Y≈0.
- Modelo: formas suaves, mãos com quatro dedos e polegar, materiais separados para pelo e pele.
- Articulação: três malhas com deformação por ossos — dois braços e rabo; 18 ossos, com dois pesos normalizados por vértice. Cabeça e tronco usam nós animados. As pernas ainda não têm esqueleto de produção.
- Animação do GLB: um ciclo de repouso de 4 segundos. Na tela de login, viradas de página, coçadas, palmas e cambalhota são coordenadas pelo código compartilhado de animação, não por clipes adicionais dentro do GLB.
- Exportação: glTF 2.0 binário (GLB), aproximadamente 0,9 MB, sem cenário, câmera ou luzes. O botão exporta a cor selecionada.
- Geometria: aproximadamente 110 mil triângulos, para revisão. Otimizar antes de integrar à tela de login.
- Compatibilidade: WebGL, limite de resolução em 1,5×, renderização até 30 fps, pausa fora da área visível e preferência de movimento reduzido respeitada inicialmente.

## Próxima etapa recomendada

Aprovar proporções e expressão nesta prévia. Para acabamento final, refinar no Blender a continuidade das superfícies, a topologia, as mãos e o esqueleto completo. Depois, exportar um GLB otimizado com ações separadas e integrar ao Tomo. O modelo procedural é editável em código e serve como ponto de partida, não como alegação de escultura final.

Documentação primária utilizada: [Three.js](https://threejs.org/docs/), [GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html), [SkinnedMesh](https://threejs.org/docs/pages/SkinnedMesh.html).
