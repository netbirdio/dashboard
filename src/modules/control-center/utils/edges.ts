import AnimatedLine from "@/modules/control-center/edges/AnimatedLine";
import { BidirectionalEdges } from "@/modules/control-center/edges/BidirectionalEdges";
import { DirectionIn } from "@/modules/control-center/edges/DirectionIn";
import FloatingEdge from "@/modules/control-center/edges/FloatingEdge";
import { SimpleConnection } from "@/modules/control-center/edges/SimpleConnection";

export const EDGE_TYPES = {
  in: DirectionIn,
  bi: BidirectionalEdges,
  floating: FloatingEdge,
  "floating-straight": AnimatedLine,
  simple: SimpleConnection,
};
