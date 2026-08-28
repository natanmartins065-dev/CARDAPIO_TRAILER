const listaProdutos = document.getElementById("lista-produtos");
const formProduto = document.getElementById("form-produto");
const selectCategoriaProduto = document.getElementById("select-categoria-produto");
const inputNomeProduto = document.getElementById("input-nome-produto");
const inputDescricaoProduto = document.getElementById("input-descricao-produto");
const inputPrecoProduto = document.getElementById("input-preco-produto");

let categoriasCache = [];

verificarLoginEIniciar();


supabaseClient.auth.onAuthStateChange((evento, sessao) => {
  if (evento === "SIGNED_OUT" || !sessao) {
    window.location.href = "login.html";
  }
});

async function verificarLoginEIniciar() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  await carregarCategoriasParaSelect();
  carregarProdutos();
}

async function carregarCategoriasParaSelect() {
  const { data: categorias, error } = await supabaseClient
    .from("categories")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    selectCategoriaProduto.innerHTML = `<option value="">Erro ao carregar categorias</option>`;
    return;
  }

  categoriasCache = categorias;

  selectCategoriaProduto.innerHTML = `<option value="">Categoria...</option>`;
  categorias.forEach((categoria) => {
    const opcao = document.createElement("option");
    opcao.value = categoria.id;
    opcao.textContent = categoria.name;
    selectCategoriaProduto.appendChild(opcao);
  });
}

formProduto.addEventListener("submit", async (e) => {
  e.preventDefault();

  const categoryId = selectCategoriaProduto.value;
  const nome = inputNomeProduto.value.trim();
  const descricao = inputDescricaoProduto.value.trim();
  const preco = parseFloat(inputPrecoProduto.value);

  if (!categoryId || !nome || isNaN(preco)) {
    alert("Preencha categoria, nome e um preço válido.");
    return;
  }

  const { data: existentes } = await supabaseClient
    .from("products")
    .select("display_order")
    .eq("category_id", categoryId)
    .order("display_order", { ascending: false })
    .limit(1);

  const proximaOrdem = existentes && existentes.length > 0 ? existentes[0].display_order + 1 : 0;

  const { error } = await supabaseClient.from("products").insert({
    category_id: categoryId,
    name: nome,
    description: descricao || null,
    price: preco,
    is_active: true,
    display_order: proximaOrdem
  });

  if (error) {
    alert("Erro ao adicionar produto: " + error.message);
    return;
  }

  formProduto.reset();
  carregarProdutos();
});

async function carregarProdutos() {
  const { data: produtos, error } = await supabaseClient
    .from("products")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    listaProdutos.innerHTML = `<p class="erro-cliente">Erro ao carregar produtos: ${error.message}</p>`;
    return;
  }

  if (produtos.length === 0) {
    listaProdutos.innerHTML = `<p class="carregando">Nenhum produto ainda.</p>`;
    return;
  }

  listaProdutos.innerHTML = "";

  categoriasCache.forEach((categoria) => {
    const produtosDaCategoria = produtos.filter((p) => p.category_id === categoria.id);
    if (produtosDaCategoria.length === 0) return;

    const grupo = document.createElement("div");
    grupo.className = "grupo-categoria-produtos";
    grupo.innerHTML = `<h3>${categoria.name}</h3>`;

    produtosDaCategoria.forEach((produto) => {
      grupo.appendChild(criarCardProduto(produto));
    });

    listaProdutos.appendChild(grupo);
  });
}

function criarCardProduto(produto) {
  const card = document.createElement("div");
  card.className = "card-produto";
  renderizarModoVisualizacao(card, produto);
  return card;
}

function renderizarModoVisualizacao(card, produto) {
  card.innerHTML = `
    <div class="card-produto-topo">
      <span class="card-produto-nome">${produto.name}</span>
      <button class="${produto.is_active ? 'badge-ativo' : 'badge-inativo'}">
        ${produto.is_active ? 'Ativo' : 'Inativo'}
      </button>
    </div>
    ${produto.description ? `<div class="card-produto-desc">${produto.description}</div>` : ""}
    <div class="card-produto-preco">R$ ${Number(produto.price).toFixed(2)}</div>
    <div class="card-produto-acoes">
      <button class="btn-editar">Editar</button>
      <button class="btn-cancelar">Excluir</button>
    </div>
  `;

  card.querySelector(".badge-ativo, .badge-inativo").addEventListener("click", () =>
    alternarAtivo(produto)
  );
  card.querySelector(".btn-editar").addEventListener("click", () =>
    renderizarModoEdicao(card, produto)
  );
  card.querySelector(".btn-cancelar").addEventListener("click", () =>
    excluirProduto(produto.id, produto.name)
  );
}

function renderizarModoEdicao(card, produto) {
  card.innerHTML = `
    <input type="text" class="campo-input edit-nome" value="${produto.name}">
    <input type="text" class="campo-input edit-descricao" value="${produto.description || ""}" placeholder="Descrição">
    <input type="number" class="campo-input edit-preco" value="${produto.price}" step="0.01" min="0">
    <select class="campo-input edit-categoria">
      ${categoriasCache.map((c) => `<option value="${c.id}" ${c.id === produto.category_id ? "selected" : ""}>${c.name}</option>`).join("")}
    </select>
    <div class="card-produto-acoes">
      <button class="btn-editar btn-salvar">Salvar</button>
      <button class="btn-cancelar btn-cancelar-edicao">Cancelar</button>
    </div>
  `;

  card.querySelector(".btn-salvar").addEventListener("click", async () => {
    const novoNome = card.querySelector(".edit-nome").value.trim();
    const novaDescricao = card.querySelector(".edit-descricao").value.trim();
    const novoPreco = parseFloat(card.querySelector(".edit-preco").value);
    const novaCategoria = card.querySelector(".edit-categoria").value;

    if (!novoNome || isNaN(novoPreco) || !novaCategoria) {
      alert("Preencha um nome, preço e categoria válidos.");
      return;
    }

    const { error } = await supabaseClient
      .from("products")
      .update({ name: novoNome, description: novaDescricao || null, price: novoPreco, category_id: novaCategoria })
      .eq("id", produto.id);

    if (error) {
      alert("Erro ao salvar: " + error.message);
      return;
    }

    carregarProdutos();
  });

  card.querySelector(".btn-cancelar-edicao").addEventListener("click", () => {
    renderizarModoVisualizacao(card, produto);
  });
}

async function alternarAtivo(produto) {
  const { error } = await supabaseClient
    .from("products")
    .update({ is_active: !produto.is_active })
    .eq("id", produto.id);

  if (error) {
    alert("Erro ao atualizar: " + error.message);
    return;
  }

  carregarProdutos();
}

async function excluirProduto(id, nome) {
  const confirmar = confirm(`Excluir o produto "${nome}"? Isso só funciona se ele nunca tiver sido pedido.`);
  if (!confirmar) return;

  const { error } = await supabaseClient.from("products").delete().eq("id", id);

  if (error) {
    alert("Não foi possível excluir. Provavelmente esse produto já apareceu em algum pedido. Detalhe: " + error.message);
    return;
  }

  carregarProdutos();
}