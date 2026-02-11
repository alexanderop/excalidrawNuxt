import noCallbackObjectProps from "./no-callback-object-props";

const plugin = {
  rules: {
    "no-callback-object-props": noCallbackObjectProps,
  },
} as const;

export default plugin;
