# O ebook — The Squeeze Method

As 49 páginas do livro, e tudo que é preciso para reconstruí-las.

Isto esteve por semanas numa pasta temporária do Windows, que o sistema pode
limpar sem avisar. Se aquilo tivesse acontecido, o livro não teria como ser
corrigido nem regerado — só rediagramado do zero. Agora está aqui.

## Reconstruir

```bash
node ebook/paginate.mjs        # monta o ebook2.html a partir do conteúdo
node ebook/check2.mjs          # confere se nada estoura a página, e gera o PDF
python ebook/otimiza.py ebook/ebook2.pdf the-squeeze-method-ebook.pdf
```

O `check2.mjs` é o que importa antes de entregar qualquer versão nova: ele mede
cada uma das 49 páginas e acusa qualquer bloco que passe da margem. Tem de
terminar com **`overflowing 0`**. Já aconteceu de uma frase a mais empurrar a
caixa de aviso por cima do rodapé, e isso não aparece no HTML — só no PDF.

Depois de conferir, promova o HTML:

```
ebook2.html  ->  ebook.html
```

## O terceiro passo não é opcional

O `otimiza.py` **encolhe o PDF em cerca de 37%** — de 1,79 MB para 1,13 MB — e
o PDF que vai para a cliente é o que sai dele, não o que sai do `check2.mjs`.

O motivo: o Chromium embute o fundo listrado como uma **cópia separada em cada
uma das 49 páginas**. São 60 imagens distintas no arquivo, quando na verdade
existem 11. O `otimiza.py` junta as repetidas e recomprime o resto.

Isso não mexe em nada do que se vê. Foi conferido página a página, renderizando
as 49 nos dois arquivos e comparando pixel a pixel: **zero diferenças**, e o
texto extraído é idêntico.

Precisa do `pymupdf` (`pip install pymupdf`). É a única parte da construção que
não é Node.

> Não dá para resolver isso no CSS: a duplicação acontece na hora em que o
> Chromium escreve o PDF, não na página. Por isso é um passo depois, e não um
> ajuste no `paginate.mjs`.

## Os arquivos

| Arquivo | O que é |
| --- | --- |
| `blocks.json` | O conteúdo do livro, capítulo a capítulo, já separado em blocos |
| `paginate.mjs` | Distribui os blocos em páginas de 6×9in e monta o HTML |
| `check2.mjs` | Confere transbordo e renderiza o PDF |
| `estilo-base.css` | A folha de estilo do livro |
| `logo_uri.txt` | O logo da cliente, embutido como data URI |
| `anat_final.png` | A ilustração da anatomia |
| `ebook.html` | O livro montado — o que gera o PDF entregue |

`ebook2.html` e `ebook2.pdf` são saídas da construção e ficam fora do git.

## Duas coisas que não estão aqui, de propósito

**O material original da Cátia.** O `sample.html` de onde o estilo saiu tinha
280 KB do ebook dela. O que a construção precisa são 5 KB de CSS, então foram
extraídos uma vez para `estilo-base.css`, conferindo que não veio texto nenhum
junto. O ebook dela e o manuscrito `.docx` ficam fora do repositório.

**O PDF entregue.** Ele é gerado, não versionado: sai do `check2.mjs` e vai
para a pasta do projeto, um nível acima.

## A paginação é medida, não estimada

O `paginate.mjs` não chuta onde a página quebra. Ele mede a altura real de cada
bloco num navegador, empacota as páginas, e depois **confere o resultado contra
o layout de verdade**, movendo blocos para a página seguinte enquanto houver
transbordo. Também evita terminar uma página num título sozinho.

O motivo é simples: toda vez que a quebra foi inferida em vez de medida, saiu
errado — e o erro só aparecia no PDF final, depois de pronto.
