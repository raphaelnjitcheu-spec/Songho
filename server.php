<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$roomsDir = 'rooms/';
if (!is_dir($roomsDir)) {
    mkdir($roomsDir, 0777, true);
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// --- 1. CRÉATION DU SALON ---
if ($action === 'create') {
    $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $roomCode = '';
    for ($i = 0; $i < 5; $i++) {
        $roomCode .= $chars[rand(0, strlen($chars) - 1)];
    }
    
    $initialState = [
        "board" => array_fill(0, 14, 5),
        "scores" => ["p1" => 0, "p2" => 0],
        "currentPlayer" => 1, 
        "gameOver" => false,
        "endReason" => "",
        "alertMessage" => "",
        "playersConnected" => ["p1" => true, "p2" => false]
    ];
    
    file_put_contents($roomsDir . $roomCode . '.json', json_encode($initialState));
    echo json_encode(["status" => "ok", "roomCode" => $roomCode, "role" => 1, "state" => $initialState]);
    exit;
}

// --- 2. REJOINDRE LE SALON ---
if ($action === 'join') {
    $roomCode = isset($_GET['room']) ? strtoupper(trim($_GET['room'])) : '';
    $filePath = $roomsDir . $roomCode . '.json';
    
    if (empty($roomCode) || !file_exists($filePath)) {
        echo json_encode(["status" => "error", "message" => "Code de salon introuvable."]);
        exit;
    }
    
    $state = json_decode(file_get_contents($filePath), true);
    $role = 0; 
    
    if (!$state['playersConnected']['p1']) {
        $state['playersConnected']['p1'] = true;
        $role = 1;
    } elseif (!$state['playersConnected']['p2']) {
        $state['playersConnected']['p2'] = true;
        $role = 2;
    } else {
        // Déjà deux joueurs ? Le second joueur se reconnecte ou garde son rôle
        $role = 2;
    }
    
    file_put_contents($filePath, json_encode($state));
    echo json_encode(["status" => "ok", "role" => $role, "state" => $state]);
    exit;
}

// --- 3. SYNCHRONISATION EN TEMPS RÉEL (GET) ---
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['room'])) {
    $roomCode = strtoupper(trim($_GET['room']));
    $filePath = $roomsDir . $roomCode . '.json';
    if (file_exists($filePath)) {
        echo file_get_contents($filePath);
    } else {
        echo json_encode(["status" => "error"]);
    }
    exit;
}

// --- 4. MISE À JOUR (POST) ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $roomCode = isset($input['room']) ? strtoupper(trim($input['room'])) : '';
    $filePath = $roomsDir . $roomCode . '.json';
    
    if (!empty($roomCode) && file_exists($filePath)) {
        if ($input['action'] === 'update') {
            file_put_contents($filePath, json_encode($input['state']));
            echo json_encode(["status" => "ok"]);
        } elseif ($input['action'] === 'reset') {
            $resetState = [
                "board" => array_fill(0, 14, 5),
                "scores" => ["p1" => 0, "p2" => 0],
                "currentPlayer" => 1,
                "gameOver" => false,
                "endReason" => "",
                "alertMessage" => "",
                "playersConnected" => ["p1" => true, "p2" => true]
            ];
            file_put_contents($filePath, json_encode($resetState));
            echo json_encode(["status" => "ok"]);
        }
    }
    exit;
}
?>