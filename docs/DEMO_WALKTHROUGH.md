# Five-minute demonstration

1. Run the application and select **Open demo workspace**.
2. On the dashboard, review current cash, payables, receivables and budget utilization. These are calculated from NovaTech's fictional records.
3. Open **Risk center** → `CM-1042`. Two records share the same vendor/reference/amount, and the amount is above the earlier vendor average. Expand evidence to inspect the score, prior values and source IDs. The signal does not establish fraud.
4. Open the pending duplicate record `inv-1043`. Add a review reason and choose **Investigate**. Open **Audit trail** to see the before/after state and reason.
5. Open **Cash flow** and select 30, 60 or 90 days. Inspect the exact payable and receivable records included in that horizon.
6. Open `OH-0821`. A partial payment is already recorded. Record another valid partial payment with a unique bank reference. The balance, cash, budgets and audit trail refresh. An amount above the outstanding balance is rejected.
7. In **Invoices → Import**, download the CSV template, select it, validate and confirm. Re-importing the same content is blocked. Change a total in the preview text to see row validation.
8. For document import, upload an actual PDF/image invoice. With AI connected, extracted fields appear for review; otherwise fill them manually. Save and confirm the fields on the invoice before approval.
9. Ask the advisor why cash is changing, or open it from an invoice. Inspect the calculation and citations. The disconnected demo clearly labels its rule-based response.
10. Sign out and choose **Viewer role** to check the read-only interface. Server authorization also denies forged write requests.
