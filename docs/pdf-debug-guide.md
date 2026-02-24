# PDF Generation Debug Configuration

## Environment Variables

Add these to your `.env` file for detailed PDF generation logging:

```bash
# Enable detailed PDF generation logging
PDF_DEBUG=true

# Base URL for internal API calls (for gold rates)
BASE_URL=http://localhost:3000

# Node environment
NODE_ENV=development
```

## Log Levels and Tags

### PDF Service Logs

- `[PDF-GEN]` - General PDF generation process logs
- `[PDF-GEN-ERROR]` - PDF generation errors with stack traces

### Invoice Route Logs

- `[INVOICE-PDF]` - Main invoice PDF endpoint logs
- `[INVOICE-PDF-DIRECT]` - Direct PDF endpoint logs

## Sample Log Output

When `PDF_DEBUG=true`, you'll see logs like:

```
[PDF-GEN] Starting PDF generation for invoice: GL-0001
[PDF-GEN] Launching puppeteer browser
[PDF-GEN] Browser launched successfully
[PDF-GEN] New page created
[PDF-GEN] Generating HTML content
[PDF-GEN] HTML content generated, length: 12845 characters
[PDF-GEN] Setting page content
[PDF-GEN] Page content set successfully
[PDF-GEN] Generating PDF buffer
[PDF-GEN] PDF generated successfully in 1250ms, size: 45123 bytes
[PDF-GEN] Closing browser
[PDF-GEN] Browser closed successfully
```

## Error Debugging

Common issues and their log signatures:

1. **Browser Launch Failure**

   ```
   [PDF-GEN-ERROR] Error during PDF generation: Browser launch failed
   ```

2. **HTML Content Issues**

   ```
   [PDF-GEN-ERROR] Error generating HTML content: Missing required data
   ```

3. **Gold Rate Fetch Failure**
   ```
   [INVOICE-PDF] Failed to fetch current gold rates, using defaults: timeout of 5000ms exceeded
   ```

## Performance Monitoring

Logs include timing information:

- Browser launch time
- Total PDF generation time
- PDF buffer size

## Production Considerations

In production:

- Set `PDF_DEBUG=false` to reduce log volume
- Monitor `[PDF-GEN-ERROR]` logs for system issues
- Track PDF generation times for performance optimization
