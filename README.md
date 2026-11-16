# União dos Camaradas Felinos

Aplicação web adaptada para publicação **100% gratuita** no **GitHub Pages** usando o plano gratuito (**Spark**) do Firebase Authentication + Cloud Firestore (sem servidor pago e sem cartão de crédito).

## Como publicar de graça no GitHub Pages

1. Crie um repositório no GitHub e envie este projeto para a branch `main`.
2. No GitHub, abra **Settings → Pages → Build and deployment** e escolha **Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` vai compilar automaticamente a pasta `dist/` com `VITE_STATIC_HOSTING=true` e publicar o site no endereço `https://SEU-USUARIO.github.io/NOME-DO-REPO/`.
4. **Importante (Login Google no Firebase):**
   - Acesse o [Firebase Console](https://console.firebase.google.com/) no projeto `gen-lang-client-0013579491`.
   - Vá em **Authentication → Settings → Authorized domains**.
   - Adicione o domínio do seu GitHub Pages: `SEU-USUARIO.github.io`.

## Dados dos jogadores e migração automática

- O novo banco Firestore já está provisionado e com as regras de segurança publicadas.
- Na primeira entrada pela página publicada, os dados existentes (`Admin` e `Amy`, sequência, telegramas, carteiras, itens desbloqueados, visual dos gatinhos e senha da sala) são importados automaticamente para o novo banco Firestore sem perda de progresso.

## Desenvolvimento local

```bash
npm install
npm run dev
```
