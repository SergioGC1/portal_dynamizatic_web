import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import useJwt from '../../../hooks/useJwt';
import { useAuth } from '../../../contexts/AuthContext';

const Register = () => {
    const [username, setUsername] = useState<string>("");
    const [apellidos, setApellidos] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmed, setConfirmed] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const { signUp, signIn } = useJwt();
    const { login } = useAuth();
    const navigate = useNavigate();
    const dark = false; // fallback simple si no hay layoutConfig
    const goToLogin = () => {
        navigate('/login');
    }
    const handleSignUp = async () => {
        // Validación cliente básica
        const fErrors: Record<string, string> = {}
        if (!username.trim()) fErrors.username = 'El nombre de usuario es obligatorio'
        if (!apellidos.trim()) fErrors.apellidos = 'Los apellidos son obligatorios'
        if (!email.trim()) fErrors.email = 'El correo es obligatorio'
        else {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) fErrors.email = 'Introduce un correo válido'
        }
        if (!password) fErrors.password = 'La contraseña es obligatoria'
        if (!confirmed) fErrors.confirmed = 'Debes aceptar los términos y condiciones'
        if (Object.keys(fErrors).length) {
            setFieldErrors(fErrors)
            setError('Por favor corrige los errores del formulario')
            return;
        }
        // email simple
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Introduce un correo electrónico válido.');
            return;
        }
        if (!confirmed) {
            setError('Debes aceptar los términos y condiciones.');
            return;
        }

        setError(null);


        const payload = { nombreUsuario: username, apellidos, email, password };
        console.debug('Register payload:', payload);

        try {
            const resp = await signUp(payload);

            if (resp) {
                // Si el backend no devolvió tokens en el registro, intentamos iniciar sesión automáticamente
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    try {
                        const signinData = await signIn({ email, password });
                        // signIn guarda tokens en localStorage y devuelve data
                        login(signinData);
                        navigate('/');
                        return;
                    } catch (errSign: any) {
                        console.warn('Registro OK pero login automático falló:', errSign);
                        // mostrar mensaje pero no bloquear al usuario
                        setError('Registro completado pero no se pudo iniciar sesión automáticamente. Por favor inicia sesión.');
                        return;
                    }
                }

                // Si ya hay token (backend devolvió tokens), hacemos login y navegamos
                login(resp);
                navigate('/');
            }

        } catch (err: any) {
            console.error('Error al registrar usuario', err);
            // Preferimos body/status adjuntos por el adaptador si existen
            const serverData = err?.body || err?.response?.data || err?.response || err?.message || '';
            const text = typeof serverData === 'string' ? serverData : JSON.stringify(serverData || '');
            const lower = text.toLowerCase();

            // Extraer detalles si existen (para decisiones más precisas)
            const details = serverData?.error?.details || serverData?.details || [];

            // Extraer un message humano del serverData de forma robusta
            let serverMsg: string | null = null;
            try {
                if (typeof serverData === 'object' && serverData !== null) {
                    serverMsg = serverData.error?.message || serverData.message || null;
                } else if (typeof serverData === 'string') {
                    // Intentar parsear JSON incrustado en la cadena
                    const first = serverData.indexOf('{');
                    const last = serverData.lastIndexOf('}');
                    if (first !== -1 && last !== -1 && last > first) {
                        try {
                            const parsed = JSON.parse(serverData.substring(first, last + 1));
                            serverMsg = parsed?.error?.message || parsed?.message || null;
                        } catch (e) { /* ignore */ }
                    }
                    // Si no hemos extraído message, intentar parsear desde la primera llave
                    if (!serverMsg) {
                        const jsonStart = serverData.indexOf('{"');
                        if (jsonStart !== -1) {
                            try {
                                const parsed = JSON.parse(serverData.substring(jsonStart));
                                serverMsg = parsed?.error?.message || parsed?.message || null;
                            } catch (e) { /* ignore */ }
                        }
                    }
                    // Como último recurso, si la cadena contiene comillas con el mensaje
                    if (!serverMsg) {
                        const m = serverData.match(/["\u201c\u201d']([^"']{5,100})["\u201c\u201d']/);
                        if (m && m[1]) serverMsg = m[1];
                    }
                }
            } catch (e) {
                serverMsg = null;
            }

            if (serverMsg && typeof serverMsg === 'string') {
                const sm = serverMsg.trim();
                const sml = sm.toLowerCase();

                // Detectar mensajes de duplicado / ER_DUP_ENTRY y mapear a mensajes amigables
                if (sml.includes('duplicate') || sml.includes('er_dup_entry') || sml.includes('duplicate entry') || sml.includes('already exists') || sml.includes('unique')) {
                    if (sml.includes('correo') || sml.includes('email') || sml.includes('e-mail') || sml.includes('correo electrónico')) {
                        setFieldErrors({ email: 'El correo electrónico ya está en uso.' });
                    } else if (sml.includes('nombre') || sml.includes('usuario')) {
                        setFieldErrors({ username: 'El nombre de usuario ya existe' });
                    } else {
                        setFieldErrors({ username: 'Ya existe un usuario con esos datos' });
                    }
                    setError(null);
                    return;
                }

                // Mapear a campo por palabras clave y eliminar JSON largo del UI
                if (sml.includes('correo') || sml.includes('email') || sml.includes('e-mail') || sml.includes('correo electrónico')) {
                    setFieldErrors({ email: sm });
                    setError(null);
                    return;
                }
                if (sml.includes('usuario') || sml.includes('nombre de usuario') || sml.includes('nombre')) {
                    setFieldErrors({ username: sm });
                    setError(null);
                    return;
                }
                // Si no identificamos el campo, mostramos sólo el message humano (corto)
                setError(sm.length > 300 ? sm.substring(0, 300) + '...' : sm);
                return;
            }

            // Detección simple de duplicados en el texto (prioritaria)
            if (lower.includes('duplicate') || lower.includes('already exists') || lower.includes('unique')) {
                setFieldErrors({ username: 'El nombre de usuario ya existe' });
                return;
            }

            // Si hay detalles de validación, mapearlos de forma sencilla a fieldErrors

            if (Array.isArray(details) && details.length) {
                const fErrors: Record<string, string> = {};
                for (const d of details) {
                    try {
                        const path = (d.path || d.context?.key || '').toString().replace(/^\//, '') || 'password';
                        const key = (path === 'nombreUsuario' || path === 'nombre' || path === 'userName') ? 'username' : ((path === 'correo' || path === 'mail') ? 'email' : path);
                        if (d.code === 'minLength' || (d.message && d.message.toLowerCase().includes('fewer than'))) {
                            fErrors['password'] = 'La contraseña debe tener al menos 8 caracteres';
                        } else if (d.message) {
                            fErrors[key] = d.message;
                        }
                    } catch (ee) { /* continue */ }
                }
                setFieldErrors(fErrors);
                return;
            }

            // Heurística para 'request body is invalid': solo mapear a password si el texto
            // o los detalles indican explícitamente que hay un problema con la contraseña.
            if (lower.includes('request body is invalid') || lower.includes('the request body is invalid') || lower.includes('see error object')) {
                const indicatesPassword = lower.includes('password') || lower.includes('contraseña') || lower.includes('min') || lower.includes('length') || lower.includes('fewer') || (Array.isArray(details) && details.some(d => String(d.path || d.context?.key || '').toLowerCase().includes('password')));
                if (indicatesPassword) {
                    setFieldErrors({ password: 'La contraseña debe tener al menos 8 caracteres' });
                    return;
                }
                // si no indica password, caer al fallback
            }

            // Fallback claro
        }
    };

    return (
        <>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 1600 800"
                className="fixed left-0 top-0 min-h-screen min-w-screen"
                preserveAspectRatio="none"
            >
                <rect
                    fill={dark ? "var(--primary-900)" : "var(--primary-500)"}
                    width="1600"
                    height="800"
                />
                <path
                    fill={dark ? "var(--primary-800)" : "var(--primary-400)"}
                    d="M478.4 581c3.2 0.8 6.4 1.7 9.5 2.5c196.2 52.5 388.7 133.5 593.5 176.6c174.2 36.6 349.5 29.2 518.6-10.2V0H0v574.9c52.3-17.6 106.5-27.7 161.1-30.9C268.4 537.4 375.7 554.2 478.4 581z"
                />
                <path
                    fill={dark ? "var(--primary-700)" : "var(--primary-300)"}
                    d="M181.8 259.4c98.2 6 191.9 35.2 281.3 72.1c2.8 1.1 5.5 2.3 8.3 3.4c171 71.6 342.7 158.5 531.3 207.7c198.8 51.8 403.4 40.8 597.3-14.8V0H0v283.2C59 263.6 120.6 255.7 181.8 259.4z"
                />
                <path
                    fill={dark ? "var(--primary-600)" : "var(--primary-200)"}
                    d="M454.9 86.3C600.7 177 751.6 269.3 924.1 325c208.6 67.4 431.3 60.8 637.9-5.3c12.8-4.1 25.4-8.4 38.1-12.9V0H288.1c56 21.3 108.7 50.6 159.7 82C450.2 83.4 452.5 84.9 454.9 86.3z"
                />
                <path
                    fill={dark ? "var(--primary-500)" : "var(--primary-100)"}
                    d="M1397.5 154.8c47.2-10.6 93.6-25.3 138.6-43.8c21.7-8.9 43-18.8 63.9-29.5V0H643.4c62.9 41.7 129.7 78.2 202.1 107.4C1020.4 178.1 1214.2 196.1 1397.5 154.8z"
                />
            </svg>
            <div className="px-5 min-h-screen flex justify-content-center align-items-center">
                <div className="border-1 surface-border surface-card border-round py-7 px-4 md:px-7 z-1">
                    <div className="mb-4">
                        <div className="text-900 text-xl font-bold mb-2">
                            Crear cuenta
                        </div>
                        <span className="text-600 font-medium">
                            Empecemos
                        </span>
                        {error && (
                            <div className="p-error mt-3">{error}</div>
                        )}
                    </div>
                    <div className="flex flex-column">
                        <label className="mb-1 font-medium">Nombre de usuario <span style={{ color: 'red' }}>*</span></label>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-user"></i>
                            <InputText
                                id="username"
                                name="username"
                                type="text"
                                value={username}
                                onChange={(e: any) => setUsername(e.target?.value)}
                                className="w-full md:w-25rem"
                                style={fieldErrors.username ? { border: '1px solid red' } : undefined}
                                placeholder="Nombre de usuario"
                            />
                        </span>
                        {fieldErrors.username && <div style={{ color: 'red', fontSize: 13, marginTop: -8, marginBottom: 8 }}>{fieldErrors.username}</div>}

                        <label className="mb-1 font-medium">Apellidos <span style={{ color: 'red' }}>*</span></label>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-user"></i>
                            <InputText
                                id="apellidos"
                                name="apellidos"
                                type="text"
                                value={apellidos}
                                onChange={(e: any) => setApellidos(e.target?.value)}
                                className="w-full md:w-25rem"
                                style={fieldErrors.apellidos ? { border: '1px solid red' } : undefined}
                                placeholder="Apellidos"
                            />
                        </span>
                        {fieldErrors.apellidos && <div style={{ color: 'red', fontSize: 13, marginTop: -8, marginBottom: 8 }}>{fieldErrors.apellidos}</div>}

                        <label className="mb-1 font-medium">Correo electrónico <span style={{ color: 'red' }}>*</span></label>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-envelope"></i>
                            <InputText
                                id="email"
                                name="email"
                                type="text"
                                value={email}
                                onChange={(e: any) => setEmail(e.target?.value)}
                                className="w-full md:w-25rem"
                                style={fieldErrors.email ? { border: '1px solid red' } : undefined}
                                placeholder="Correo electrónico"
                            />
                        </span>
                        {fieldErrors.email && <div style={{ color: 'red', fontSize: 13, marginTop: -8, marginBottom: 8 }}>{fieldErrors.email}</div>}

                        <label className="mb-1 font-medium">Contraseña <span style={{ color: 'red' }}>*</span></label>
                        <span className="p-input-icon-left w-full mb-4">
                            <i className="pi pi-lock z-2"></i>
                            <Password
                                id="password"
                                name="password"
                                value={password}
                                onChange={(e: any) => setPassword(e.target?.value)}
                                type="password"
                                className="w-full"
                                inputClassName={fieldErrors.password ? 'w-full md:w-25rem p-password-error' : 'w-full md:w-25rem'}
                                placeholder="Contraseña"
                                toggleMask
                                inputStyle={{ paddingLeft: "2.5rem", ...(fieldErrors.password ? { border: '1px solid red' } : {}) }}
                            />
                        </span>
                        {fieldErrors.password && <div style={{ color: 'red', fontSize: 13, marginTop: -8, marginBottom: 8 }}>{fieldErrors.password}</div>}
                        <div className="mb-4 flex flex-wrap align-items-center">
                            <Checkbox
                                id="checkbox"
                                name="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.checked ?? false)}
                                className="mr-2"
                            />
                            <label htmlFor="checkbox" className="text-900 font-medium mr-2">
                                He leído y acepto <span style={{ color: 'red' }}>*</span>
                            </label>
                            <button type="button" className="text-600 hover:text-primary p-0 border-none bg-transparent cursor-pointer">
                                Términos y condiciones
                            </button>
                        </div>
                        {fieldErrors.confirmed && <div style={{ color: 'red', fontSize: 13, marginTop: -8, marginBottom: 8 }}>{fieldErrors.confirmed}</div>}
                        <Button label="Registrarse" className="w-full mb-4" onClick={handleSignUp} />
                        <span className="font-medium text-600">
                            ¿Ya tienes una cuenta?{" "}
                            <button type="button" className="font-semibold text-900 hover:text-primary transition-colors transition-duration-300 bg-transparent border-none p-0 cursor-pointer" onClick={goToLogin}>
                                Iniciar sesión
                            </button>
                        </span>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Register;
