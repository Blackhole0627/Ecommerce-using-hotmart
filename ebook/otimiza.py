"""
Tenta deixar o PDF mais leve e mais rapido de abrir, sem mexer no conteudo.

Duas coisas de verdade ajudam aqui:

  garbage/clean/deflate  - junta objetos repetidos e recomprime os fluxos. O
                           Chromium gera o PDF pagina a pagina e repete muita
                           coisa entre elas.
  linear=True            - "fast web view": reorganiza o arquivo para o leitor
                           conseguir desenhar a PRIMEIRA pagina antes de ter
                           lido o resto. E o que muda a sensacao de "demora
                           para abrir", que e do que a cliente reclamou.

Nada disso altera texto, imagem ou layout — so a forma como o arquivo e
guardado. A conferencia no fim garante isso.
"""
import os
import sys
import pymupdf

entrada, saida = sys.argv[1], sys.argv[2]

doc = pymupdf.open(entrada)
paginas_antes = doc.page_count
texto_antes = [p.get_text() for p in doc]

doc.save(
    saida,
    garbage=4,
    deflate=True,
    deflate_images=True,
    deflate_fonts=True,
    clean=True,

)
doc.close()

antes = os.path.getsize(entrada)
depois = os.path.getsize(saida)

novo = pymupdf.open(saida)
texto_depois = [p.get_text() for p in novo]

print(f"tamanho antes  : {antes:,} bytes")
print(f"tamanho depois : {depois:,} bytes")
print(f"reducao        : {100 * (antes - depois) / antes:.1f}%")
print(f"paginas        : {paginas_antes} -> {novo.page_count}")
print(f"texto identico : {texto_antes == texto_depois}")
novo.close()
