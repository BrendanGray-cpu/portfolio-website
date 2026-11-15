---
title: Contract Sign-up
order: 1
illustration: contract
company: BambooHR
status: Shipped
role: Product Designer, sole designer on the initiative
team: PM, design and engineering trio
timeline: About 11 months, to February 2026
caption: Review, sign and pay after working with a sales rep.
hook: The sales-assisted path to buying BambooHR. A prospect reviews the order, signs the terms, adds payment and starts their subscription.
prototype: https://billing-checkout-v2.vercel.app/
hero: previews/contract-sign-up.webp
hero_video: contract-signer.mp4
hero_alt: In BambooHR's account settings, the signer copies a payment link for finance, then reviews the order form and accepts the terms.
---

## Problem
Starting a subscription happened mostly outside the product. A prospect added payment through an outside link, and a sales rep started the subscription for them.

Legal had no in-app record of who accepted the terms or when, which made disputes and audits hard. BambooHR also offered no contracts, so every customer was month-to-month.

## Constraints
The person who signs is rarely the person who holds the company card. That second person is often a founder or finance lead with no BambooHR login who didn’t want to make one.

Payment had to work by card, ACH, wire or check, and each step could happen inside or outside the app.

## Decision
We built a shareable payment link. The signer sends it over Slack, and the finance person adds payment info in their browser without an account. If the signer has the payment info, they can go through the flow themselves without leaving the app. When both steps are done, the subscription starts.

[video contract-payer.mp4 | Finance opens the link in a browser and adds a card, with no BambooHR account | narrow]

[video contract-inapp.mp4 | When the signer has the card, they add it in the app without leaving the flow]

An earlier version opened on a wall of legal text beside a PDF preview. I made the order form the first thing you see, with the actions on the right once you've reviewed it.

## Outcome
It shipped. Every new customer now signs up through this flow, and by the time I left a third were choosing an extended-term contract.

Customers on contracts churned at a fraction of the month-to-month rate, and every acceptance is now on record.

## Reflection
The initiative ran close to a year, and new edge cases kept arriving from billing, legal and sales. Next time I'd collect use cases from every stakeholder up front, before the first iteration.
