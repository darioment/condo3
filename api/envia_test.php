<?php
// Configuración de CORS más permisiva
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

// Manejar solicitudes OPTIONS para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require 'vendor/autoload.php';
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Obtener los datos del POST
$rawData = file_get_contents('php://input');
error_log("Datos recibidos: " . $rawData);

$data = json_decode($rawData, true);

// Validar datos requeridos
if (!isset($data['name']) || !isset($data['email']) || !isset($data['message']) || !isset($data['asunto'])) {
    error_log("Faltan datos requeridos en la solicitud");
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Faltan datos requeridos'
    ]);
    exit();
}

try {
    $mail = new PHPMailer(true);
    
    // Configuración del servidor SMTP
    $mail->isSMTP();
    $mail->Host = 'smtp.resend.com';
    $mail->SMTPAuth = true;
    $mail->Username = 'resend';
    $mail->Password = 're_2Pi85fD7_5cDeEfV8apEd3RQCZ7hY3w7s';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    $mail->Port = 465;
    $mail->SMTPDebug = 0; // Deshabilitar debug
    
    // Remitente y destinatario
    $mail->setFrom('admin@contafactura.com.mx', $data['name']);
    $mail->addAddress($data['email']);
    
    // Contenido del correo
    $mail->isHTML(true);
    $mail->Subject = 'Estado de cuenta ' . $data['name'];
    $mail->Body = "
        <h2>{$data['message']}</h2>
        <p><strong>Nombre:</strong> {$data['name']}</p>
        <p><strong>Email:</strong> {$data['email']}</p>
        <p><strong>Asunto:</strong> {$data['asunto']}</p>
    ";
    
    // Adjuntar PDF si viene en el request (después de crear $mail)
    if (isset($data['pdf_base64']) && !empty($data['pdf_base64'])) {
        $pdfContent = base64_decode($data['pdf_base64']);
        $mail->addStringAttachment($pdfContent, 'estado_cuenta.pdf', 'base64', 'application/pdf');
    }

    error_log("Enviando correo...");
    $mail->send();
    error_log("Correo enviado exitosamente");

    $response = [
        'success' => true,
        'message' => 'Correo enviado exitosamente',
        'data' => [
            'name' => $data['name'],
            'email' => $data['email'],
            'asunto' => $data['asunto']
        ]
    ];

    error_log("Enviando respuesta: " . json_encode($response));
    echo json_encode($response);
} catch (Exception $e) {
    error_log("Error al enviar el correo: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Error al enviar el correo: ' . $mail->ErrorInfo
    ]);
} 