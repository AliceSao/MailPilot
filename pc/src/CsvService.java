import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public class CsvService {

    public List<Map<String, String>> parseCsv(String csvContent) {
        List<Map<String, String>> accounts = new ArrayList<>();
        if (csvContent == null || csvContent.trim().isEmpty()) return accounts;

        String[] lines = csvContent.split("\\r?\\n");
        if (lines.length < 2) return accounts;

        String[] headers = parseCsvLine(lines[0]);
        Map<String, Integer> headerMap = new LinkedHashMap<>();
        for (int i = 0; i < headers.length; i++) {
            headerMap.put(headers[i].trim().toLowerCase(), i);
        }

        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            String[] values = parseCsvLine(line);
            Map<String, String> account = new LinkedHashMap<>();

            for (Map.Entry<String, Integer> entry : headerMap.entrySet()) {
                String key = entry.getKey();
                int idx = entry.getValue();
                String value = idx < values.length ? values[idx].trim() : "";
                account.put(key, value);
            }

            if (account.containsKey("email") && !account.get("email").isEmpty()) {
                accounts.add(account);
            }
        }
        return accounts;
    }

    public String toCsv(List<Map<String, String>> accounts) {
        if (accounts == null || accounts.isEmpty()) return "";

        Set<String> allKeys = new LinkedHashSet<>();
        for (Map<String, String> acc : accounts) {
            allKeys.addAll(acc.keySet());
        }
        allKeys.remove("_index");

        List<String> headers = new ArrayList<>(allKeys);
        StringBuilder sb = new StringBuilder();

        sb.append(String.join(",", headers)).append("\r\n");

        for (Map<String, String> acc : accounts) {
            List<String> row = new ArrayList<>();
            for (String key : headers) {
                String value = acc.getOrDefault(key, "");
                row.add(escapeCsvField(value));
            }
            sb.append(String.join(",", row)).append("\r\n");
        }
        return sb.toString();
    }

    private String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (inQuotes) {
                if (c == '"') {
                    if (i + 1 < line.length() && line.charAt(i + 1) == '"') {
                        current.append('"');
                        i++;
                    } else {
                        inQuotes = false;
                    }
                } else {
                    current.append(c);
                }
            } else {
                if (c == '"') {
                    inQuotes = true;
                } else if (c == ',') {
                    fields.add(current.toString());
                    current = new StringBuilder();
                } else {
                    current.append(c);
                }
            }
        }
        fields.add(current.toString());
        return fields.toArray(new String[0]);
    }

    private String escapeCsvField(String value) {
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}