const inputEmail = document.getElementById("input-email");
const inputSenha = document.getElementById("input-senha");
const erroLogin = document.getElementById("erro-login");
const btnLogin = document.getElementById("btn-login");
const linkVoltarCardapio = document.getElementById("link-voltar-cardapio");

btnLogin.addEventListener("click", fazerLogin);

inputSenha.addEventListener("keydown", (e) => {
  if (e.key === "Enter") fazerLogin();
});

// Intercepta o clique: em vez de empilhar uma entrada nova no histórico,
// substitui a entrada do login.html pela do cardápio.
linkVoltarCardapio.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.replace("/index.html");
});

async function fazerLogin() {
  const email = inputEmail.value.trim();
  const senha = inputSenha.value;

  if (!email || !senha) {
    mostrarErro("Preencha e-mail e senha.");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Entrando...";

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mostrarErro("E-mail ou senha incorretos.");
    btnLogin.disabled = false;
    btnLogin.textContent = "Entrar";
    return;
  }

  // Login deu certo — substitui a entrada do login.html pela do painel,
  // em vez de empilhar (senão o login.html fica alcançável pelo botão físico)
  window.location.replace("index.html");
}

function mostrarErro(mensagem) {
  erroLogin.textContent = mensagem;
  erroLogin.classList.remove("oculto");
}


// ATUALIZAÇÃO AUTOMÁTICA DO APP
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });

  navigator.serviceWorker.ready.then((registro) => {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        registro.update();
      }
    });
  });
}