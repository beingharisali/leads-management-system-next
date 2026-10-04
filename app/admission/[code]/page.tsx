"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
    getPublicForm, submitPublicForm, toWhatsAppNumber, AdmissionReceipt, PublicFormInfo, SubmissionResult,
} from "@/services/admission.api";
import { getErrorMessage } from "@/services/http";
import "./admission.css";

const MAX_ORIGINAL_BYTES = 12 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 1700000;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Shrinks a chosen photo to a JPEG of at most 1600px on its long side.
async function compress(file: File): Promise<Blob> {
    if (!IMAGE_TYPES.includes(file.type) || file.size > MAX_ORIGINAL_BYTES) {
        throw new Error("Choose a JPG, PNG or WebP photo below 12 MB.");
    }
    const bitmap = await createImageBitmap(file);
    const factor = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * factor);
    canvas.height = Math.round(bitmap.height * factor);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.86));
    if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error("Choose a smaller image.");
    return blob;
}

// Object URL for a blob, revoked when the blob changes or the page unmounts.
function useObjectUrl(blob: Blob | null) {
    const url = useMemo(() => (blob ? URL.createObjectURL(blob) : ""), [blob]);
    useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
    return url;
}

const formatFee = (fee: number | null) => (fee == null ? "Confirm with admissions" : `PKR ${fee.toLocaleString("en-PK")}`);

function receiptText(r: AdmissionReceipt) {
    const s = r.snapshot;
    return [
        "IDEOVERSITY ADMISSION RECEIPT",
        `Receipt: ${r.receiptId}`,
        `Student: ${r.fullName}`,
        `Accepted at: ${r.acceptedAt}`,
        `Admission reference: ${r.reference}`,
        `Course: ${s.admission.course}`,
        s.admission.schedule,
        `Total fees: ${formatFee(s.admission.totalFeePKR)}`,
        `Terms version: ${s.version}`,
        `Terms SHA-256: ${r.termsHash}`,
        "", "ACCEPTED STATEMENT", s.checkboxText,
        "", "ACCEPTED TERMS", ...s.terms.map((t, i) => `${i + 1}. ${t}`),
        "", "Before classes begin", s.admission.beforeStartRefundTerms,
        "", "Additional terms", s.admission.additionalTerms || "None",
        "", "Course outline", s.admission.outline,
        "", "Identity notice", s.identityNotice,
        "", `Administration: ${s.admission.complaintContact}`,
    ].join("\n");
}

// After submitting: the student pays the registration amount and sends the
// screenshot to the CSR who shared the link, on WhatsApp.
function PaymentNextStep({ receipt, csr }: { receipt: AdmissionReceipt; csr: SubmissionResult["csr"] | null }) {
    const csrName = csr?.name || "your CSR";
    const number = csr?.whatsapp ? toWhatsAppNumber(csr.whatsapp) : "";
    const message = [
        `Hello, I have filled the IDEOVERSITY admission form.`,
        `Name: ${receipt.fullName}`,
        `Course: ${receipt.snapshot.admission.course}`,
        `Receipt: ${receipt.receiptId}`,
        `Here is my registration payment screenshot.`,
    ].join("\n");

    return (
        <div className="nextStep" role="status">
            <strong>Next step: pay the registration amount</strong>
            <p>
                The form has been filled. Now pay the registration amount and send the payment screenshot
                to <b>{csrName}</b> on WhatsApp{csr?.whatsapp ? <> at <b>{csr.whatsapp}</b></> : null}.
            </p>
            {number && (
                <a className="whatsapp" href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                    Send screenshot on WhatsApp
                </a>
            )}
        </div>
    );
}

// Public admission form. CSRs share /admission/<their code>; no login needed.
// Submissions are saved in the leads system and forwarded to the LMS.
export default function PublicAdmissionPage() {
    const { code } = useParams<{ code: string }>();
    const [info, setInfo] = useState<PublicFormInfo | null>(null);
    const [loadError, setLoadError] = useState("");

    const [courseId, setCourseId] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [website, setWebsite] = useState("");
    const [accepted, setAccepted] = useState(false);

    const [idBlob, setIdBlob] = useState<Blob | null>(null);
    const [idStatus, setIdStatus] = useState("JPG, PNG or WebP. Maximum original image size: 12 MB.");
    const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
    const [cameraOn, setCameraOn] = useState(false);
    const [cameraPending, setCameraPending] = useState(false);
    const [cameraStatus, setCameraStatus] = useState("Your camera only opens when you press the button.");
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [receipt, setReceipt] = useState<AdmissionReceipt | null>(null);
    const [csrContact, setCsrContact] = useState<SubmissionResult["csr"] | null>(null);
    const [submittedWithoutReceipt, setSubmittedWithoutReceipt] = useState(false);
    const errorRef = useRef<HTMLParagraphElement>(null);

    const idUrl = useObjectUrl(idBlob);
    const selfieUrl = useObjectUrl(selfieBlob);

    useEffect(() => {
        if (!code) return;
        getPublicForm(code)
            .then(setInfo)
            .catch(err => setLoadError(getErrorMessage(err, "This admission link could not be loaded.")));
    }, [code]);

    const course = info?.courses.find(c => c.id === courseId);

    const categories = useMemo(() => {
        const groups = new Map<string, PublicFormInfo["courses"]>();
        for (const c of info?.courses ?? []) groups.set(c.category, [...(groups.get(c.category) ?? []), c]);
        return [...groups];
    }, [info]);

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraOn(false);
    };

    useEffect(() => {
        window.addEventListener("pagehide", stopCamera);
        return () => { window.removeEventListener("pagehide", stopCamera); stopCamera(); };
    }, []);

    const onIdCard = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setIdBlob(null);
        setError("");
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIdStatus("Preparing photo…");
            setIdBlob(await compress(file));
            setIdStatus("ID card photo ready. Check that the details are readable.");
        } catch (err) {
            setError(getErrorMessage(err, "This photo could not be used."));
            setIdStatus("Choose another photo.");
        }
    };

    const openCamera = async () => {
        if (cameraPending) return;
        setCameraPending(true);
        stopCamera();
        setError("");
        try {
            if (!navigator.mediaDevices?.getUserMedia) throw new Error("Camera access needs HTTPS. Open this link in Chrome or Safari.");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } },
                audio: false,
            });
            streamRef.current = stream;
            setCameraOn(true);
            const video = videoRef.current!;
            video.srcObject = stream;
            await video.play();
            setCameraStatus("Keep your face visible, then take the photo.");
        } catch (err) {
            stopCamera();
            setError((err as Error)?.name === "NotAllowedError"
                ? "Camera permission was denied. Allow camera access in your browser settings, then retry."
                : getErrorMessage(err, "The camera could not be opened."));
        } finally {
            setCameraPending(false);
        }
    };

    const capture = async () => {
        const video = videoRef.current;
        if (!video?.videoWidth) { setError("Wait for the camera image before taking your photo."); return; }
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d")!.drawImage(video, 0, 0);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
        if (!blob) { setError("Could not capture your photo. Please retry."); return; }
        setSelfieBlob(blob);
        stopCamera();
        setCameraStatus("Selfie ready.");
    };

    const retake = () => { setSelfieBlob(null); openCamera(); };

    const detailsValid = fullName.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10;
    const ready = !busy && !!course && detailsValid && !!idBlob && !!selfieBlob && accepted;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ready || !info || !idBlob || !selfieBlob) return;
        setBusy(true);
        setError("");
        try {
            const result = await submitPublicForm(code, {
                fullName: fullName.trim(),
                phone: phone.trim(),
                courseId,
                idCard: idBlob,
                selfie: selfieBlob,
                termsVersion: info.terms.version,
                website,
            });
            stopCamera();
            if (result) {
                setReceipt(result.receipt);
                setCsrContact(result.csr);
            }
            else setSubmittedWithoutReceipt(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (err) {
            setError(getErrorMessage(err, "Your admission could not be saved. Please try again."));
            requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
        } finally {
            setBusy(false);
        }
    };

    const downloadReceipt = () => {
        if (!receipt) return;
        const blob = new Blob([receiptText(receipt)], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `IDEOVERSITY-receipt-${receipt.receiptId}.txt`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const terms = info?.terms;
    const done = !!receipt || submittedWithoutReceipt;

    return (
        <div className="idv">
            <main>
                <header>
                    <div className="brand">IDEO<span>VERSITY</span></div>
                    <div className="badge">Admission confirmation</div>
                </header>

                {!done && (
                    <section className="intro">
                        <div className="eyebrow">ONE FINAL STEP</div>
                        <h1>Confirm your admission.</h1>
                        <p>Upload your ID card, take a selfie and accept the admission terms.</p>
                    </section>
                )}

                {!info && !loadError && <p className="loading" role="status">Loading your admission…</p>}
                {(loadError || error) && (
                    <p ref={errorRef} className="error" role="alert">{loadError || error}</p>
                )}

                {info && terms && !done && (
                    <form onSubmit={handleSubmit}>
                        {/* Honeypot: hidden from people, bots fill it */}
                        <input
                            className="honeypot"
                            type="text"
                            name="website"
                            value={website}
                            onChange={e => setWebsite(e.target.value)}
                            tabIndex={-1}
                            autoComplete="off"
                            aria-hidden="true"
                        />

                        <section className="course">
                            <label htmlFor="courseSelect" className="courseLabel">Choose your course</label>
                            <select
                                id="courseSelect"
                                required
                                value={courseId}
                                onChange={e => { setCourseId(e.target.value); setAccepted(false); }}
                            >
                                <option value="">Select a course…</option>
                                {categories.map(([category, list]) => (
                                    <optgroup key={category} label={category}>
                                        {list.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </optgroup>
                                ))}
                            </select>
                            <p className="small">{info.courses.length} courses from IDEO College. Select one to see its outline.</p>
                            {course && (
                                <div aria-live="polite">
                                    <h2>{course.name}</h2>
                                    <h3>Course outline</h3>
                                    <p className="outline preserve">{course.outline.map(l => `• ${l}`).join("\n")}</p>
                                    <p className="small">
                                        Summary of the published curriculum. Checked{" "}
                                        {new Date(info.outlineCheckedOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.
                                    </p>
                                    <a className="courseSource" href={course.url} target="_blank" rel="noopener noreferrer">
                                        View full course page on IDEO College ↗
                                    </a>
                                    <p>{terms.schedule}</p>
                                    <div className="fee"><span>Total course fees</span><strong>{formatFee(terms.totalFeePKR)}</strong></div>
                                </div>
                            )}
                            <p className="small">Shared by {info.csrName}</p>
                        </section>

                        <section className="card">
                            <div className="step">1</div>
                            <h2>Your details</h2>
                            <p>Enter your name as it appears on your ID card, and a number we can reach you on.</p>
                            <label className="field">
                                <span>Full name</span>
                                <input value={fullName} onChange={e => setFullName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
                            </label>
                            <label className="field">
                                <span>Phone / WhatsApp</span>
                                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required maxLength={20} placeholder="03xx xxxxxxx" autoComplete="tel" inputMode="tel" />
                            </label>
                        </section>

                        <section className="card">
                            <div className="step">2</div>
                            <h2>Upload your ID card</h2>
                            <p>Choose a clear photo of the front of your CNIC or B Form. All details must be readable.</p>
                            <label className="upload">
                                Choose ID card photo
                                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onIdCard} />
                            </label>
                            <p className="small" role="status">{idStatus}</p>
                            {idUrl && <img className="preview" src={idUrl} alt="Your selected ID card" />}
                        </section>

                        <section className="card">
                            <div className="step">3</div>
                            <h2>Take a selfie</h2>
                            <p>Face the camera in good light. Remove sunglasses and keep your face visible.</p>
                            {!selfieBlob && (
                                <button type="button" className="secondary" onClick={openCamera} disabled={cameraPending}>Open camera</button>
                            )}
                            <video ref={videoRef} autoPlay muted playsInline hidden={!cameraOn} />
                            {cameraOn && <button type="button" className="secondary" onClick={capture}>Take photo</button>}
                            {selfieUrl && (
                                <>
                                    <img className="preview selfie" src={selfieUrl} alt="Your camera selfie" />
                                    <button type="button" className="textButton" onClick={retake}>Retake photo</button>
                                </>
                            )}
                            <p className="small" role="status">{cameraStatus}</p>
                        </section>

                        <section className="card">
                            <div className="step">4</div>
                            <h2>Terms and conditions</h2>
                            <p>Read these rules before ticking the agreement. You can ask administration for clarification.</p>
                            <ul>{terms.terms.map((t, i) => <li key={i}>{t}</li>)}</ul>
                            <h3>Before classes begin</h3>
                            <p className="preserve">{terms.beforeStartRefundTerms}</p>
                            {terms.additionalTerms && (
                                <>
                                    <h3>Course specific terms</h3>
                                    <p className="preserve">{terms.additionalTerms}</p>
                                </>
                            )}
                            <h3>Identity record notice</h3>
                            <p className="small">{terms.identityNotice}</p>
                            <p className="small">Administration contact: <span>{terms.complaintContact}</span></p>
                            <label className="check">
                                <input type="checkbox" required checked={accepted} onChange={e => setAccepted(e.target.checked)} />
                                <span>{terms.checkboxText}</span>
                            </label>
                        </section>

                        <button type="submit" className="primary" disabled={!ready}>
                            {busy ? "Saving your admission…" : "Agree and submit admission"}
                        </button>
                        <p className="small centered">Your identity documents are stored for authorised institute use. Keep this link private.</p>
                    </form>
                )}

                {receipt && (
                    <section className="card">
                        <div className="successIcon">✓</div>
                        <h1>Admission submitted.</h1>
                        <p>Thank you, {receipt.fullName.split(" ")[0]}. Your photos and agreement have been saved.</p>
                        <PaymentNextStep receipt={receipt} csr={csrContact} />
                        <dl>
                            <dt>Receipt number</dt><dd>{receipt.receiptId}</dd>
                            <dt>Accepted on</dt>
                            <dd>{new Date(receipt.acceptedAt).toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} PKT</dd>
                            <dt>Course</dt><dd>{receipt.snapshot.admission.course}</dd>
                            <dt>Admission reference</dt><dd>{receipt.reference}</dd>
                        </dl>
                        <button type="button" className="primary" onClick={downloadReceipt}>Download receipt</button>
                        <button type="button" className="secondary" onClick={() => window.print()}>Print receipt</button>
                        <div className="printTerms">{receiptText(receipt)}</div>
                        <p className="small">Save this receipt for your records.</p>
                    </section>
                )}

                {submittedWithoutReceipt && (
                    <section className="card">
                        <div className="successIcon">✓</div>
                        <h1>Admission submitted.</h1>
                        <p>Our team will contact you shortly.</p>
                    </section>
                )}

                <footer>IDEOVERSITY · Student admission</footer>
            </main>
        </div>
    );
}
