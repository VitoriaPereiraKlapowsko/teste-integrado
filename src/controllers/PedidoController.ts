import { Request, Response } from "express";
import { Produto } from "../models/Produto";
import { Cliente } from "../models/Cliente";
import { Pedido } from "../models/Pedido";
import { ItemDoPedido } from "../models/ItemDoPedido";
const request = require("supertest");
import { app } from "../server"; 


// Listar todos os pedidos e retornar objetos separados para pedido e cliente
export const listarPedidos = async (req: Request, res: Response) => {
  try {
    const pedidos = await Pedido.findAll({
      include: [
        {
          model: Cliente,
          as: "Cliente" // Use o alias correto aqui
        }
      ]
    });

    // Formata a resposta para separar os objetos de pedido e cliente
    const pedidosFormatados = pedidos.map((pedido) => ({
      pedido: {
        id: pedido.id, // Inclui o id do pedido
        data: pedido.data // Inclui a data do pedido
      },
      cliente: pedido.Cliente
        ? {
            id: pedido.Cliente.id,
            nome: pedido.Cliente.nome,
            sobrenome: pedido.Cliente.sobrenome,
            cpf: pedido.Cliente.cpf
          }
        : null
    }));

    res.json({ pedidos: pedidosFormatados });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    res.status(500).json({ message: "Erro ao listar pedidos" });
  }
};

// Buscar pedido por ID e retornar objetos separados para pedido e cliente
export const getPedidoById = async (req: Request, res: Response) => {
  try {
    const pedidoId = parseInt(req.params.idPedido, 10);
    const pedido = await Pedido.findByPk(pedidoId, {
      include: [
        {
          model: Cliente,
          as: "Cliente" // Use o alias correto aqui
        }
      ]
    });

    if (pedido) {
      const response = {
        pedido: {
          id: pedido.id,
          data: pedido.data
        },
        cliente: pedido.Cliente
          ? {
              id: pedido.Cliente.id,
              nome: pedido.Cliente.nome,
              sobrenome: pedido.Cliente.sobrenome,
              cpf: pedido.Cliente.cpf
            }
          : null
      };

      res.json(response);
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao buscar pedido:", error);
    res.status(500).json({ message: "Erro ao buscar pedido" });
  }
};

// Incluir um novo pedido
export const incluirPedido = async (req: Request, res: Response) => {
  try {
    const { data, id_cliente } = req.body;
    const novoPedido = await Pedido.create({ data, id_cliente });

    res.status(201).json(novoPedido);
  } catch (error) {
    console.error("Erro ao incluir pedido:", error);
    res.status(500).json({ message: "Erro ao incluir pedido" });
  }
};

// Atualizar um pedido existente
export const atualizarPedido = async (req: Request, res: Response) => {
  try {
    const pedidoId = parseInt(req.params.id, 10);
    const { data, id_cliente } = req.body;

    const pedido = await Pedido.findByPk(pedidoId);

    if (pedido) {
      await pedido.update({ data, id_cliente });
      res.json(pedido);
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error);
    res.status(500).json({ message: "Erro ao atualizar pedido" });
  }
};

// Excluir um pedido existente
export const excluirPedido = async (req: Request, res: Response) => {
  try {
    const pedidoId = parseInt(req.params.id, 10);
    const pedido = await Pedido.findByPk(pedidoId);

    if (pedido) {
      await pedido.destroy();
      res.json({ message: "Pedido excluído com sucesso" });
    } else {
      res.status(404).json({ message: "Pedido não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao excluir pedido:", error);
    res.status(500).json({ message: "Erro ao excluir pedido" });
  }
};

describe("Integração entre Cliente e Pedido", () => {
  let clienteId: number;
  let pedidoId: number;
  
  beforeAll(async () => {
    const cliente = await Cliente.create({
      nome: "Cliente Exemplo",
      sobrenome: "Sobrenome Exemplo",
      cpf: "98765432100"
    });
    clienteId = cliente.id;

    const pedido = await Pedido.create({
      data: "2024-08-15",
      id_cliente: clienteId
    });
    pedidoId = pedido.id;
  });

  it("Deve adicionar um novo pedido e associá-lo ao cliente correto", async () => {
    const pedidoParaAdicionar = {
      data: "2024-08-16",
      id_cliente: clienteId
    };

    const resposta = await request(app).post("/incluirPedido").send(pedidoParaAdicionar);

    expect(resposta.status).toBe(201);
    expect(resposta.body).toHaveProperty("id");
    expect(resposta.body.id_cliente).toBe(pedidoParaAdicionar.id_cliente);

    const pedidoCriado = await Pedido.findByPk(resposta.body.id);
    expect(pedidoCriado).not.toBeNull();

    if (pedidoCriado) {
      expect(pedidoCriado.id_cliente).toBe(clienteId);
    }
  });

  it("Deve retornar os pedidos associados ao cliente corretamente", async () => {
    const resposta = await request(app).get(`/clientes/${clienteId}/pedidos`);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toHaveProperty("pedidos");
    expect(resposta.body.pedidos).toBeInstanceOf(Array);
    expect(resposta.body.pedidos.length).toBeGreaterThan(0);

    const pedidoEncontrado = resposta.body.pedidos.find((p: any) => p.id === pedidoId);
    
    expect(pedidoEncontrado).toBeDefined();

    // Apenas verifica a propriedade id_cliente se o pedido foi encontrado
    if (pedidoEncontrado) {
      expect(pedidoEncontrado.id_cliente).toBe(clienteId);
    }
  });

  afterAll(async () => {
    if (pedidoId) {
      await Pedido.destroy({ where: { id: pedidoId } });
    }
    if (clienteId) {
      await Cliente.destroy({ where: { id: clienteId } });
    }
  });
});

describe("Integridade Relacional: Exclusão de Produto com Itens de Pedido", () => {
  let produtoId: number;
  let itemPedidoId: number;

  beforeAll(async () => {
    // Cria um produto e associa a um item de pedido
    const produto = await Produto.create({
      nome: "Produto Exemplo",
      preco: 150
    });
    produtoId = produto.id;

    const pedido = await Pedido.findByPk(1);   // Verifica se o pedido com ID 1 existe
    if (!pedido) {
      throw new Error('Pedido com ID 1 não encontrado');
    }

    const itemPedido = await ItemDoPedido.create({
      id_produto: produtoId,
      quantidade: 3,
      id_pedido: 1
    });
    itemPedidoId = itemPedido.id;
  });

  it("Deve impedir a exclusão de um produto com itens de pedido associados", async () => {
    const resposta = await request(app).delete(`/produtos/${produtoId}`);

    expect(resposta.status).toBe(400); 
    expect(resposta.body).toHaveProperty("message", "Produto não pode ser removido devido a itens de pedidos associados");

    // Confirma se ainda existe
    const produtoExistente = await Produto.findByPk(produtoId);
    expect(produtoExistente).not.toBeNull();

    const itemPedidoExistente = await ItemDoPedido.findByPk(itemPedidoId);
    expect(itemPedidoExistente).not.toBeNull();
  });

  afterAll(async () => {
    await ItemDoPedido.destroy({ where: { id: itemPedidoId } });
    await Produto.destroy({ where: { id: produtoId } });
  });
});




