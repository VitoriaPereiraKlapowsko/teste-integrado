const request = require("supertest");
import * as server from "../server";
import { app } from "../server"; // Certifique-se de que o caminho está correto
import { Request, Response } from "express";
import { Produto } from "../models/Produto";
import { Pedido } from '../models/Pedido';
import { ItemDoPedido } from '../models/ItemDoPedido';
import { Cliente } from '../models/Cliente';

describe("Teste da Rota incluirProduto", () => {
  let produtoId: number;

  it("Deve incluir um novo produto com sucesso", async () => {
    const novoProduto = {
      descricao: "Novo Produto"
    };

    const response = await request(app).post("/incluirProduto").send(novoProduto);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.descricao).toBe(novoProduto.descricao);

    produtoId = response.body.id; // Armazena o ID do produto recém-criado para limpeza posterior
  });

  afterAll(async () => {
    // Remove o produto criado no teste
    if (produtoId) {
      await Produto.destroy({ where: { id: produtoId } });
    }
  });
});

describe("Teste da Rota getProdutoById", () => {
  it("Deve retornar o produto correto quando o id é válido", async () => {
    const idProduto = 1; // Supondo que este seja um ID válido existente no seu banco de dados
    const response = await request(app).get(`/produtos/${idProduto}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", idProduto);
  });

  it("Deve retornar um status 404 quando o Id do produto não existe", async () => {
    const idProduto = 999;

    const response = await request(app).get(`/produtos/${idProduto}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Produto não encontrado");
  });
});

describe("Teste da Rota listarProdutos", () => {
  it("Deve retornar uma lista de produtos", async () => {
    const response = await request(app).get("/produtos");

    expect(response.status).toBe(200);
    expect(response.body.produtos).toBeInstanceOf(Array);
  });

  it("Deve retornar a lista de produtos dentro de um tempo aceitável", async () => {
    const start = Date.now();
    const response = await request(app).get("/produtos");
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(100); // Verifica se a resposta é retornada em menos de 100ms
  });
});

describe("Teste da Rota excluirProduto", () => {
  beforeAll(async () => {
    // Cria um produto com um ID único para o teste de exclusão
    await Produto.create({ id: 99, descricao: "Produto Teste" });
  });

  afterAll(async () => {
    // Limpa o banco de dados após os testes
    await Produto.destroy({ where: { id: 99 } });
  });

  it("Deve excluir um produto existente", async () => {
    // Faz a requisição para excluir o produto com ID 99
    const response = await request(app).delete("/excluirProduto/99");

    // Verifica se a resposta da API está correta
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Produto excluído com sucesso");

    // Verifica se o produto foi realmente excluído
    const produtoExcluido = await Produto.findByPk(99);
    expect(produtoExcluido).toBeNull(); // Deve retornar null se o produto foi excluído
  });
});

describe("Teste da Rota atualizarProduto", () => {
  let produtoId: number;

  beforeAll(async () => {
    // Cria um produto para ser atualizado
    const produto = await Produto.create({
      descricao: "Produto para Atualizar"
    });
    produtoId = produto.id;
  });

  it("Deve atualizar um produto com sucesso", async () => {
    const produtoAtualizado = {
      descricao: "Produto Atualizado"
    };

    const response = await request(app).put(`/atualizarProduto/${produtoId}`).send(produtoAtualizado);

    expect(response.status).toBe(200);
    expect(response.body.descricao).toBe(produtoAtualizado.descricao);
  });

  it("Deve retornar erro ao tentar atualizar produto inexistente", async () => {
    const produtoInexistenteId = 999999;
    const produtoAtualizado = {
      descricao: "Produto Inexistente"
    };

    const response = await request(app).put(`/atualizarProduto/${produtoInexistenteId}`).send(produtoAtualizado);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Produto não encontrado");
  });

  afterAll(async () => {
    // Limpeza dos produtos criados
    await Produto.destroy({ where: { id: produtoId } });
  });
});

describe("Teste da Rota itensDoPedido/:id", () => {
  let clienteId: number;
  let produtoId: number;
  let pedidoId: number;
  let itemDoPedidoId: number;

  beforeAll(async () => {
    // Cria um cliente
    const cliente = await Cliente.create({
      nome: "Cliente Teste",
      sobrenome: "Sobrenome Teste",
      cpf: "12345678900"
    });
    clienteId = cliente.id;

    // Cria um produto
    const produto = await Produto.create({
      descricao: "Produto Teste"
    });
    produtoId = produto.id;

    // Cria um pedido
    const pedido = await Pedido.create({
      clienteId: clienteId,
      data: new Date()
    });
    pedidoId = pedido.id;

    // Cria um item do pedido
    const itemDoPedido = await ItemDoPedido.create({
      pedidoId: pedidoId,
      produtoId: produtoId,
      quantidade: 1
    });
    itemDoPedidoId = itemDoPedido.id;
  });

  it("Deve retornar o item do pedido com informações do cliente, pedido e produto", async () => {
    const response = await request(app).get(`/itensDoPedido/${itemDoPedidoId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", itemDoPedidoId);
    expect(response.body).toHaveProperty("pedido");
    expect(response.body).toHaveProperty("produto");
    expect(response.body.pedido).toHaveProperty("id", pedidoId);
    expect(response.body.produto).toHaveProperty("id", produtoId);
    expect(response.body.pedido.clienteId).toBe(clienteId);
    expect(response.body.produto.descricao).toBe("Produto Teste");
  });

  it("Deve retornar 404 se o item do pedido não for encontrado", async () => {
    const response = await request(app).get("/itensDoPedido/999999");

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty("message", "Item do Pedido não encontrado");
  });

  it("Deve retornar 400 se o ID não for um número", async () => {
    const response = await request(app).get("/itensDoPedido/abc");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message", "ID deve ser um número");
  });

  it("Deve retornar o item do pedido em menos de 200ms", async () => {
    const start = Date.now();
    const response = await request(app).get(`/itensDoPedido/${itemDoPedidoId}`);
    const duration = Date.now() - start;

    expect(response.status).toBe(200);
    expect(duration).toBeLessThan(200); 
  });

  afterAll(async () => {
    await ItemDoPedido.destroy({ where: { id: itemDoPedidoId } });
    await Pedido.destroy({ where: { id: pedidoId } });
    await Produto.destroy({ where: { id: produtoId } });
    await Cliente.destroy({ where: { id: clienteId } });
  });
});

