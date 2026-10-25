# Shadecode Hardware Research: Universal Component Opportunity

**Status:** Research hypothesis, not an approved product or a claim of invention  
**Date:** 2026-10-25  
**Owner:** Shadecode  
**Decision principle:** Find a costly, widespread problem before designing a component.

## 1. Why explore hardware?

Shadecode should investigate whether it can build useful physical products alongside software. Hardware is not automatically a better business: tooling, safety, certification, supply chains, repairs, warranties, and working capital can make it expensive. The first step is therefore a low-cost prototype using existing components, followed by customer validation.

The initial product family to investigate is **Shadecode Edge**: small, maintainable systems that continue to provide useful local services when internet connectivity is poor or unavailable. The first application could be local access to educational resources, but the underlying design should not be locked to education if research demonstrates broader demand.

## 2. The question: can we create an important component used across many industries?

A component that is genuinely useful everywhere is a very high bar. There is no evidence yet that Shadecode has identified a new universal component. We should avoid claiming novelty before conducting a prior-art, product, patent, and standards review.

### Initial concept to test: Universal Resilience Module (working name)

A compact, modular hardware subsystem intended to help small connected devices and local systems remain useful through common field constraints: unstable power, interrupted internet, limited maintenance capacity, and fragmented peripheral interfaces.

**Potential functional blocks** (not a final schematic):
- **Power interface:** safe input selection and monitoring for supported DC/USB-C sources; optional battery/solar support only after electrical and thermal engineering.
- **Connectivity interface:** appropriate wired networking plus Wi-Fi/Bluetooth or cellular through replaceable modules where justified.
- **Local continuity:** non-volatile storage and a controlled way to keep essential data or services available during outages.
- **Expansion interface:** documented, protected interfaces for sensors, storage, displays, and other peripherals.
- **Health telemetry:** report power state, temperature, storage health, connectivity, and faults.
- **Secure update and recovery:** signed updates, recoverable firmware, access control, and safe configuration defaults.
- **Repairability:** replaceable modules, common connectors where practical, published diagnostics, and clear service procedures.

This is a **research architecture**, not a claim that combining these blocks is new. Similar functions already exist in single-board computers, industrial gateways, routers, UPS devices, microcontroller platforms, and edge-computing products. The opportunity would have to be a demonstrable improvement in cost, reliability, integration, repairability, deployment simplicity, or suitability for a specific underserved customer.

## 3. Where could it be used?

Potential applications to validate, not promised markets:

1. **Education:** local resource server and school-network continuity.
2. **Agriculture:** sensor collection and store-and-forward telemetry.
3. **Water and environment:** local sensor logging and fault reporting.
4. **Small businesses:** local applications and data capture during outages.
5. **Energy:** monitoring of approved low-voltage systems.
6. **Community connectivity:** local content and services on a small network.

Do not design one board to serve every use case at once. Start with one customer and one painful job. Use a shared core only if the applications genuinely share requirements.

## 4. First proof of concept: do not design a custom chip or PCB yet

Build a bench prototype from commercially available modules:
- a low-power computer or microcontroller chosen for the actual workload;
- a storage device;
- a network interface/access point as needed;
- a reputable, correctly rated power supply;
- one test sensor or peripheral;
- a simple status/diagnostics interface;
- Shadecode Edge software for local service, recovery, and synchronisation.

Initial demonstration:
1. A client connects locally without internet.
2. The system serves a selected resource or records a sensor reading.
3. Connectivity is interrupted and the core local function continues.
4. Power is restored safely and the system recovers.
5. When internet returns, queued data synchronises without duplicates or silent loss.
6. A maintainer can diagnose a failure and restore a known-good state.
7. Power consumption, uptime, latency, and recovery behaviour are measured rather than guessed.

For the first education pilot, avoid handling sensitive student records until access controls, encryption, backups, data retention, and account isolation have been designed and tested.

## 5. Validation plan

### Stage A — Customer discovery
Interview prospective users across a small, deliberately chosen sample of schools, farms, small businesses, and environmental projects. Ask about the last outage or field failure, its actual cost, current workaround, purchasing authority, maintenance skills, budget, and willingness to pay. Do not lead respondents by pitching the solution first.

### Stage B — Existing-product and prior-art review
Compare single-board computers, industrial gateways, routers, mini-UPS products, edge servers, sensor hubs, and modular power/networking products. Record prices, power draw, supported interfaces, environmental ratings, warranty, availability, and repair options. Search patents and published designs before describing the idea as novel. If protectable intellectual property may exist, obtain qualified advice before public disclosure.

### Stage C — Prototype
Use off-the-shelf components. Publish a bill of materials, wiring diagrams, safety constraints, software architecture, reproducible setup, and measured results. Use a current-limited low-voltage bench supply during early experiments. Do not prototype directly on mains electricity without a qualified engineer and appropriate protections.

### Stage D — Paid pilot
Deploy a small number of units only after bench tests and a threat/safety review. Agree on success metrics with the customer before installation. Track failures, support time, power use, uptime, repairability, and total cost of ownership.

### Stage E — Custom electronics decision
Only consider a custom PCB or custom component when measured evidence shows that off-the-shelf modules cannot meet a validated requirement at an acceptable cost. Obtain manufacturing quotations, component-lifecycle checks, certification estimates, and a repair/warranty plan first.

## 6. Go/no-go gates

Proceed only when:
- At least one specific customer segment reports a recurring, consequential problem.
- The buyer and budget owner are identified.
- Existing products and workarounds have been compared fairly.
- A prototype solves the problem measurably better or more affordably.
- The complete cost includes enclosure, power, assembly, shipping, failures, support, warranty, and compliance.
- Safety, security, privacy, maintenance, and end-of-life needs are addressed.
- The team can support the product without jeopardising Shadecode Student's core delivery.

Stop or change direction if the concept is merely a bundle of existing features without a clear advantage, if customers will not pay, or if safety/compliance costs exceed the realistic market opportunity.

## 7. Current strategic recommendation

1. Continue delivering and stabilising Shadecode Student; do not treat hardware research as a reason to pause the software roadmap.
2. Research **Shadecode Edge** as the first product application.
3. Test the **Universal Resilience Module** only as a possible shared hardware architecture.
4. Start with existing modules and a measured prototype, not custom silicon, factory tooling, or inventory.
5. Do not call the component “universal,” “first,” or “patentable” until research and evidence support those claims.

## 8. Questions this research must answer

- Which specific outage or maintenance problem costs a target customer money or learning time?
- What do existing devices already solve, and what remains unsolved?
- Is the differentiator hardware, software, local-first behaviour, integration, repairability, or service?
- Which interfaces and power ranges are truly common across the first two use cases?
- Can a first prototype be built and tested without unsafe mains work?
- What would a customer pay, who approves the purchase, and what evidence would make them trust it?
- What reliability, environmental, electrical, radio, and product-safety requirements apply in Zimbabwe and any later target markets?

**Working thesis:** The best first hardware business may not be a newly invented chip. It may be a dependable, modular, repairable system built from proven components, with a software layer that makes it substantially easier to deploy and maintain. Research must determine whether that thesis has a paying market.
