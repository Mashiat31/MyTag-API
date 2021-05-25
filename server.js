const http = require('http');
const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { connect } = require('mqtt');
const { MQTTPubSub } = require('graphql-mqtt-subscriptions');

(async () => {
  try {
    const client = connect('mqtt://mqtt.mashiat.live', { reconnectPeriod: 1000 });
    const pubsub = new MQTTPubSub({ client });
    const app = express();

    const typeDefs = gql`
      type User {
        username: String
        userId: Int
        tag: Tag
      }

      type Tag {
        label: String
        tagId: String
      }

      type Query {
        hello: String
      }

      type Mutation {
        simulateTagFoundNotification(tag: String): Boolean
      }

      type Subscription {
        notifications: String
      }
    `;
    
    const resolvers = {
      Query: {
        hello: () => 'Hello isdn 3002!'
      },
      Mutation: {
        simulateTagFoundNotification: (_, { tag }) => {
          client.publish('mytagpro/notifications', tag);
          return true
        }
      },
      Subscription: {
        notifications: {
          subscribe: (_, args) => pubsub.asyncIterator([`mytagpro/notifications`]),
          resolve:(payload, args) => payload
        }
      }
    }

    const server = new ApolloServer({ typeDefs, resolvers, playground: true, introspection: true });
    server.applyMiddleware({ app });
    console.log('Server is running');
    const httpServer = http.createServer(app);
    server.installSubscriptionHandlers(httpServer);
    await new Promise(resolve => httpServer.listen({ port: 5000 }, resolve));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();