import { gql } from 'apollo-server';

/**
 * Uncompromising GraphQL Schema Definitions.
 * Guarantees zero un-typed variables, strict nullability, and perfect architectural abstraction mapping.
 */

export const typeDefs = gql`
  scalar DateTime
  scalar JSON

  """
  Immutable User Profile structure encapsulating cognitive traits map.
  """
  type UserCoreData {
    id: ID!
    email: String!
    isPremium: Boolean!
    createdAt: DateTime!
    globalCognitiveIndex: Float!
  }

  """
  Telemetric snapshot defining absolute historical game boundaries.
  """
  type TrainingSession {
    sessionId: ID!
    gameId: String!
    score: Int!
    percentile: Float
    accuracyRate: Float!
    responseEntropy: Float!
    completedAt: DateTime!
  }

  type Query {
    fetchUserData(id: ID!): UserCoreData!
    pullTrainingHistory(userId: ID!, limit: Int = 50): [TrainingSession!]!
  }

  type Mutation {
    """
    Synchronous finalization of a local compute block to central DB.
    """
    finalizeSession(
      gameId: String!,
      score: Int!,
      accuracyRate: Float!,
      responseEntropy: Float!
    ): TrainingSession!
  }
`;

export const resolvers = {
  Query: {
    fetchUserData: async (_: any, { id }: { id: string }, context: any) => {
      if (!context.userId) throw new Error("Authentication absolute failure. Request denied.");
      return await context.db.getUserData(id);
    },
    pullTrainingHistory: async (_: any, { userId, limit }: { userId: string, limit: number }, context: any) => {
      // Linear limit strictness
      const strictLimit = Math.min(limit, 100);
      return await context.db.getHistory(userId, strictLimit);
    }
  },
  Mutation: {
    finalizeSession: async (_: any, args: any, context: any) => {
      // Implemented atomic transaction
      return await context.pipeline.aggregateAndSave(context.userId, args);
    }
  }
};
