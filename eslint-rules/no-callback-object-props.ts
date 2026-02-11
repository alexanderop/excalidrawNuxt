/**
 * ESLint rule: no-callback-object-props
 *
 * Disallows props typed as interfaces/objects where ALL members are function types.
 * These should use defineEmits instead of being passed as callback object props.
 *
 * Complements the `no-restricted-syntax` selectors that catch direct function
 * types (e.g. `markDirty: () => void`) — this rule handles the deeper case where
 * an interface/type alias of pure callbacks is passed as a single prop.
 *
 * @example
 * // ❌ Bad — all-function interface as prop
 * interface PanelCallbacks {
 *   bringToFront: () => void
 *   delete: () => void
 * }
 * defineProps<{ callbacks: PanelCallbacks }>()
 *
 * // ❌ Bad — inline object with only function members
 * defineProps<{ handlers: { onClick: () => void; onHover: () => void } }>()
 *
 * // ✅ Good — use defineEmits
 * defineEmits<{ bringToFront: []; delete: [] }>()
 *
 * // ✅ OK — interface with mixed member types (not all functions)
 * interface PanelConfig {
 *   label: string
 *   onAction: () => void
 * }
 * defineProps<{ config: PanelConfig }>()
 */

function areAllMembersFunctions(members: any[]): boolean {
  if (members.length === 0) return false;
  return members.every((member: any) => {
    if (member.type !== "TSPropertySignature") return false;
    const typeAnn = member.typeAnnotation?.typeAnnotation;
    return typeAnn?.type === "TSFunctionType";
  });
}

export default {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow props typed as all-function interfaces/objects — use defineEmits instead",
    },
    messages: {
      callbackObjectProp:
        'Prop "{{propName}}" is typed as "{{typeName}}" which contains only function members. Use defineEmits instead of callback object props.',
      inlineCallbackObject:
        'Prop "{{propName}}" is an inline object type where all members are functions. Use defineEmits instead of callback object props.',
    },
    schema: [],
  },

  create(context: any) {
    const allFunctionTypes = new Map<string, unknown>();

    return {
      // Track interface declarations where ALL members are function types
      TSInterfaceDeclaration(node: any) {
        const members = node.body?.body ?? [];
        if (areAllMembersFunctions(members)) {
          allFunctionTypes.set(node.id.name, node);
        }
      },

      // Track type aliases where ALL members are function types
      TSTypeAliasDeclaration(node: any) {
        if (node.typeAnnotation?.type !== "TSTypeLiteral") return;
        if (areAllMembersFunctions(node.typeAnnotation.members)) {
          allFunctionTypes.set(node.id.name, node);
        }
      },

      // Check defineProps for callback object props
      CallExpression(node: any) {
        if (node.callee?.type !== "Identifier" || node.callee.name !== "defineProps") return;

        // @typescript-eslint/parser v8+ uses typeArguments (not typeParameters)
        const typeArgs = node.typeArguments ?? node.typeParameters;
        if (!typeArgs || typeArgs.params.length === 0) return;

        const typeLiteral = typeArgs.params[0];
        if (typeLiteral.type !== "TSTypeLiteral") return;

        for (const member of typeLiteral.members) {
          if (member.type !== "TSPropertySignature") continue;

          const propName = member.key?.type === "Identifier" ? member.key.name : "unknown";
          const typeAnn = member.typeAnnotation?.typeAnnotation;
          if (!typeAnn) continue;

          // Case 1: Reference to an all-function interface/type alias
          if (
            typeAnn.type === "TSTypeReference" &&
            typeAnn.typeName?.type === "Identifier" &&
            allFunctionTypes.has(typeAnn.typeName.name)
          ) {
            context.report({
              node: member,
              messageId: "callbackObjectProp",
              data: { propName, typeName: typeAnn.typeName.name },
            });
          }

          // Case 2: Inline object type where all members are functions
          if (typeAnn.type === "TSTypeLiteral" && areAllMembersFunctions(typeAnn.members)) {
            context.report({
              node: member,
              messageId: "inlineCallbackObject",
              data: { propName },
            });
          }
        }
      },
    };
  },
};
