<?php

header('Content-Type: application/json; charset=utf-8');

// Load the data from data.json
$jsonData = file_get_contents('data.json');
$data = json_decode($jsonData, true);

// Get the requested action from the query string or POST body
$action = $_GET['action'] ?? null;
$requestMethod = $_SERVER['REQUEST_METHOD'];

// Helper function to format currency
function formatCurrency($num) {
    if (!is_numeric($num) || $num === null) {
        return 'نامشخص';
    }
    // Corrected: Multiply by 1000 to convert to Rial and then format
    $finalNum = floatval($num) * 1000;
    return number_format($finalNum) . ' تومان';
}

// Helper function for international currency formatting
function formatInternationalCurrency($num) {
    if (!is_numeric($num) || $num === null) {
        return 'نامشخص';
    }
    return '$' . number_format($num, 2);
}

// Route the request based on the action
if ($action === 'options') {
    $type = $_GET['type'] ?? null;

    if ($type === 'degrees' && isset($data['variable'])) {
        echo json_encode(array_keys($data['variable']));
    } elseif ($type === 'field-groups' && isset($_GET['degree']) && isset($data['variable'][$_GET['degree']])) {
        echo json_encode(array_keys($data['variable'][$_GET['degree']]['نظری'] ?? []));
    } elseif ($type === 'levels' && isset($_GET['fieldGroup']) && isset($data['base'][$_GET['fieldGroup']])) {
        echo json_encode(array_keys($data['base'][$_GET['fieldGroup']]));
    } elseif ($type === 'locations' && isset($data['selfGoverning'])) {
        echo json_encode(array_keys($data['selfGoverning']));
    } elseif ($type === 'self-governing-degrees' && isset($_GET['location']) && isset($data['selfGoverning'][$_GET['location']])) {
        echo json_encode(array_keys($data['selfGoverning'][$_GET['location']]));
    } elseif ($type === 'currency-degrees' && isset($data['currency'])) {
        echo json_encode(array_keys($data['currency']));
    } elseif ($type === 'currency-field-groups' && isset($_GET['degree']) && isset($data['currency'][$_GET['degree']])) {
        echo json_encode(array_keys($data['currency'][$_GET['degree']]));
    } elseif ($type === 'currency-levels' && isset($_GET['degree']) && isset($_GET['fieldGroup']) && isset($data['currency'][$_GET['degree']][$_GET['fieldGroup']])) {
        echo json_encode(array_keys($data['currency'][$_GET['degree']][$_GET['fieldGroup']]));
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Not found or invalid parameters.']);
    }

} elseif ($action === 'calculate' && $requestMethod === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $degree = $input['degree'] ?? null;
    $fieldGroup = $input['fieldGroup'] ?? null;
    $level = $input['level'] ?? null;
    $units = $input['units'] ?? [];

    if (!$degree || !$fieldGroup || !$level) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required selections.']);
        exit;
    }

    $baseAmount = floatval(str_replace(',', '', $data['base'][$fieldGroup][$level] ?? 0));
    $variableTotal = 0;

    foreach ($units as $unitType => $count) {
        $count = intval($count);
        if ($count > 0) {
            $costPerUnit = floatval(str_replace(',', '', $data['variable'][$degree][$unitType][$fieldGroup][$level] ?? 0));
            $variableTotal += $count * $costPerUnit;
        }
    }

    $total = $baseAmount + $variableTotal;
    echo json_encode([
        'baseTuition' => formatCurrency($baseAmount),
        'variableTuition' => formatCurrency($variableTotal),
        'totalTuition' => formatCurrency($total)
    ]);

} elseif ($action === 'calculate-self-governing' && $requestMethod === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $location = $input['location'] ?? null;
    $degree = $input['degree'] ?? null;

    if (!$location || !$degree) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing selections.']);
        exit;
    }

    $amount = $data['selfGoverning'][$location][$degree] ?? 0;
    echo json_encode([
        'totalTuition' => formatCurrency($amount)
    ]);

} elseif ($action === 'calculate-currency' && $requestMethod === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $degree = $input['degree'] ?? null;
    $fieldGroup = $input['fieldGroup'] ?? null;
    $level = $input['level'] ?? null;

    if (!$degree || !$fieldGroup || !$level) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing selections.']);
        exit;
    }

    $amount = $data['currency'][$degree][$fieldGroup][$level] ?? 0;
    echo json_encode([
        'totalTuition' => formatInternationalCurrency($amount)
    ]);

} else {
    http_response_code(404);
    echo json_encode(['error' => 'Invalid action or request method.']);
}

?>