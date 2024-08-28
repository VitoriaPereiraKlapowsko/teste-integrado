"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("item_do_pedido", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      id_pedido: {
        type: Sequelize.INTEGER,
        references: {
          model: "pedidos",
          key: "id"
        },
        allowNull: false
      },
      id_produto: {
        type: Sequelize.INTEGER,
        references: {
          model: "produtos",
          key: "id"
        },
        allowNull: false
      },
      qtdade: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable("item_do_pedido");
  }
};
