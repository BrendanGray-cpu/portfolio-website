---
title: Checkout
order: 4
illustration: checkout
company: BambooHR
status: Didn't ship while I was there
role: Lead Product Designer, design and usability owner
team: PM, design and engineering trio
timeline: About three months
caption: Buying BambooHR without talking to sales.
hook: A self-service way for small companies to buy BambooHR without a sales call.
prototype: https://trial-checkout-real.vercel.app/
hero: previews/checkout.webp
hero_video: checkout-stepped.mp4
hero_alt: The stepped checkout from plan to payment: picking a package, adding company details, agreeing to the order form, paying, and landing on the purchase confirmation.
todo: Confirm the dates. The old copy said 2025, but the work likely ran late 2025 into 2026.
---

## Problem
Buying HR software usually means a sales call, because pricing is gated behind a quote from sales. Our PM's research found a real share of prospects who wouldn't talk to sales at all, and more who were reluctant.

Each one was a company that might have bought BambooHR and didn't. We scoped the first version to U.S. companies under 25 employees buying the simplest packages.

## Constraints
A self-service purchase touches nearly every team. Implementation needed a clean handoff into onboarding, sales needed to know how it affected commission, and legal required the buyer to accept the terms and a generated order form.

BambooHR doesn't process payments, so the payment processor had to sit inside the flow in an iframe.

## Decision
The company was pushing AI chat, so I built and tested a version where buyers assemble their order by talking to a chat. It tested poorly.

[video checkout-chat.mp4 | The chat version: the order builds on the left as the buyer answers on the right]

Checkout is one of the most familiar patterns on the web, and changing it adds risk at the moment someone decides to spend money. I recommended a traditional stepped checkout with clear sections and familiar fields.

## Outcome
Implementation, sales, billing and legal all approved the design, and engineering had started building it. It didn't ship before my role ended, so I have no conversion numbers to show.

## Reflection
In testing, buyers sorted themselves by how much risk they felt more than by company size, which matched what the HRIS study found. Some wanted to buy on their own, and many wanted reassurance. I learned to keep testing the premise even after the direction feels set.
