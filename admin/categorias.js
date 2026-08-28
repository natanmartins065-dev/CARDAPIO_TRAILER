const listaCategorias = document.getElementById("lista-categorias");
const formCategoria = document.getElementById("form-categoria");
const inputNomeCategoria = document.getElementById("input-nome-categoria");

verificarLoginEIniciar();

async function verificarLoginEIniciar() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  carregarCategorias();
}

formCategoria.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nome = inputNomeCategoria.value.trim();
  if (!nome) return;

  const { data: existentes } = await supabaseClient
    .from("categories")
    .select("display_order")
    .order("display_order", { ascending: false })
    .limit(1);

  const proximaOrdem = existentes && existentes.length > 0 ? existentes[0].display_order + 1 : 0;

  const { error } = await supabaseClient
    .from("categories")
    .insert({ name: nome, display_order: proximaOrdem });

  if (error) {
    alert("Erro ao adicionar categoria: " + error.message);
    return;
  }

  inputNomeCategoria.value = "";
  carregarCategorias();
});

async function carregarCategorias() {
  const { data: categorias, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    listaCategorias.innerHTML = `<p class="erro-cliente">Erro ao carregar categorias: ${error.message}</p>`;
    return;
  }

  if (categorias.length === 0) {
    listaCategorias.innerHTML = `<p class="carregando">Nenhuma categoria ainda.</p>`;
    return;
  }

  listaCategorias.innerHTML = "";
  categorias.forEach((categoria) => {
    listaCategorias.appendChild(criarLinhaCategoria(categoria));
  });
}

function criarLinhaCategoria(categoria) {
  const linha = document.createElement("div");
  linha.className = "linha-categoria";

  linha.innerHTML = `<span>${categoria.name}</span>`;

  const btnExcluir = document.createElement("button");
  btnExcluir.className = "btn-cancelar";
  btnExcluir.textContent = "Excluir";
  btnExcluir.addEventListener("click", () => excluirCategoria(categoria.id, categoria.name));
  linha.appendChild(btnExcluir);

  return linha;
}

async function excluirCategoria(id, nome) {
  const confirmar = confirm(`Excluir a categoria "${nome}"? Isso só funciona se não houver produtos nela.`);
  if (!confirmar) return;

  const { error } = await supabaseClient.from("categories").delete().eq("id", id);

  if (error) {
    alert("Não foi possível excluir. Provavelmente ainda existem produtos nessa categoria. Detalhe: " + error.message);
    return;
  }

  carregarCategorias();
}