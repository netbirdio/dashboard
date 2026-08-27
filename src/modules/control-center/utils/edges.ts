import AnimatedLine from "@/modules/control-center/edges/AnimatedLine";
import { DirectionIn } from "@/modules/control-center/edges/DirectionIn";
import { SimpleConnection } from "@/modules/control-center/edges/SimpleConnection";
import { SmartEdge } from "@/modules/control-center/edges/SmartEdge";

export const EDGE_TYPES = {
  in: DirectionIn,
  "floating-straight": AnimatedLine,
  simple: SimpleConnection,
  smart: SmartEdge,
};
