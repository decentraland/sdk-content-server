import { IMetricsComponent } from "@well-known-components/interfaces"
import { validateMetricsDeclaration } from "@well-known-components/metrics"

export const metricDeclarations = {
  world_deployments_counter: {
    help: "Count world deployments",
    type: IMetricsComponent.CounterType,
    labelNames: [],
  },
}

// type assertions
validateMetricsDeclaration(metricDeclarations)
