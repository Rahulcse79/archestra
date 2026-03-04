import { RouteId, SecretsManagerType } from "@shared";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import SecretModel from "@/models/secret";
import { secretManager } from "@/secrets-manager";
import {
  ApiError,
  constructResponseSchema,
  SelectSecretSchema,
  UuidIdSchema,
} from "@/types";

const SecretsManagerTypeSchema = z.nativeEnum(SecretsManagerType);

const secretsRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.get(
    "/api/secrets/type",
    {
      schema: {
        operationId: RouteId.GetSecretsType,
        description:
          "Get the secrets manager type and configuration details (for Vault)",
        tags: ["Secrets"],
        response: constructResponseSchema(
          z.object({
            type: SecretsManagerTypeSchema,
            meta: z.record(z.string(), z.string()),
          }),
        ),
      },
    },
    async (_request, reply) => {
      return reply.send(secretManager().getUserVisibleDebugInfo());
    },
  );

  fastify.get(
    "/api/secrets/:id",
    {
      schema: {
        operationId: RouteId.GetSecret,
        description: "Get a secret by ID",
        tags: ["Secrets"],
        params: z.object({
          id: UuidIdSchema,
        }),
        response: constructResponseSchema(SelectSecretSchema),
      },
    },
    async ({ params: { id } }, reply) => {
      // Security: Only expose BYOS secrets (which contain vault references, safe to expose).
      // Non-BYOS secrets contain actual values (API keys, tokens, etc.) and must not be leaked.
      const secret = await SecretModel.findById(id);

      if (!secret) {
        throw new ApiError(404, "Secret not found");
      }

      // Only allow access if the secret is a BYOS secret to not leak actual values
      // (we want to expose only vault references)
      if (!secret.isByosVault) {
        throw new ApiError(
          403,
          "Access to non-BYOS secrets is not allowed via this endpoint",
        );
      }

      // For BYOS secrets, we want to return the raw secret column (vault references)
      // without resolving them. Use SecretModel directly instead of secretManager
      // to avoid resolving vault references.
      return reply.send(secret);
    },
  );

  fastify.post(
    "/api/secrets/check-connectivity",
    {
      schema: {
        operationId: RouteId.CheckSecretsConnectivity,
        description:
          "Check connectivity to the secrets storage and return secret count.",
        tags: ["Secrets"],
        response: constructResponseSchema(
          z.object({
            secretCount: z.number(),
          }),
        ),
      },
    },
    async (_request, reply) => {
      const result = await secretManager().checkConnectivity();
      return reply.send(result);
    },
  );
};

export default secretsRoutes;
