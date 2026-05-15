import { useState, useRef, useEffect } from 'react'
import { Info, CircleUser, Users, Church, Image as ImageIcon, Sparkles, X, Camera, ChevronLeft, Send, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db, storage } from './firebase'
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment, serverTimestamp, getDoc, setDoc, where, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

import html2canvas from 'html2canvas'

// 환경 변수에서 API 키를 가져옵니다.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

const ALLOWED_USERS = [
  { name: '박재형', birthdate: '940721' },
  { name: '최형준', birthdate: '960302' },
  { name: '이기창', birthdate: '970901' },
  { name: '홍성인', birthdate: '950203' }
]

type Page = 'login' | 'home' | 'prayer' | 'gallery' | 'ai'

const RAW_PARTICIPANTS = [
  { name: '강동일', birthdate: '031011' }, { name: '강민지', birthdate: '970122' },
  { name: '고예지', birthdate: '970118' }, { name: '공미은', birthdate: '960131' },
  { name: '권다혜', birthdate: '010707' }, { name: '김가을', birthdate: '921005' },
  { name: '김다혜', birthdate: '010223' }, { name: '김다희', birthdate: '010223' },
  { name: '김명인', birthdate: '971201' }, { name: '김병성', birthdate: '030314' },
  { name: '김복진', birthdate: '971112' }, { name: '김봄', birthdate: '070626' },
  { name: '김선우', birthdate: '040212' }, { name: '김성령', birthdate: '930719' },
  { name: '김성주', birthdate: '980903' }, { name: '김세진', birthdate: '951213' },
  { name: '김예인', birthdate: '020920' }, { name: '김예현', birthdate: '040109' },
  { name: '김윤미', birthdate: '870827' }, { name: '김주원', birthdate: '041025' },
  { name: '김주현', birthdate: '000103' }, { name: '김주희', birthdate: '980522' },
  { name: '김준섭', birthdate: '950213' }, { name: '김지유', birthdate: '050407' },
  { name: '김하영', birthdate: '000804' }, { name: '김하은', birthdate: '070910' },
  { name: '김한나', birthdate: '941114' }, { name: '김환희', birthdate: '000509' },
  { name: '나수연', birthdate: '010918' }, { name: '문다성', birthdate: '041202' },
  { name: '박경현', birthdate: '000101' }, { name: '박민성', birthdate: '071211' },
  { name: '박상우', birthdate: '010428' }, { name: '박상진', birthdate: '031025' },
  { name: '박상현', birthdate: '000605' }, { name: '박서은', birthdate: '050525' },
  { name: '박서후', birthdate: '991113' }, { name: '박석환', birthdate: '010307' },
  { name: '박세웅', birthdate: '031014' }, { name: '박세웅', birthdate: '071216' },
  { name: '박세은', birthdate: '030523' }, { name: '박수민', birthdate: '070524' },
  { name: '박순경', birthdate: '031004' }, { name: '박재형', birthdate: '940721' },
  { name: '박찬수', birthdate: '010828' }, { name: '서보민', birthdate: '990527' },
  { name: '선우민', birthdate: '010303' }, { name: '선우원', birthdate: '050513' },
  { name: '설수빈', birthdate: '040516' }, { name: '설수민', birthdate: '030131' },
  { name: '신혜민', birthdate: '020417' }, { name: '심다인', birthdate: '000103' },
  { name: '안나현', birthdate: '020321' }, { name: '안예진', birthdate: '971024' },
  { name: '양진우', birthdate: '981018' }, { name: '오수민', birthdate: '000101' },
  { name: '오혜령', birthdate: '011204' }, { name: '유수빈', birthdate: '971207' },
  { name: '유현종', birthdate: '070725' }, { name: '윤세연', birthdate: '040324' },
  { name: '윤혜인', birthdate: '050730' }, { name: '이가연', birthdate: '970108' },
  { name: '이가현', birthdate: '010221' }, { name: '이가형', birthdate: '050310' },
  { name: '이광민', birthdate: '010323' }, { name: '이기창', birthdate: '970901' },
  { name: '이동규', birthdate: '990315' }, { name: '이명근', birthdate: '781027' },
  { name: '이모세', birthdate: '931127' }, { name: '이선우', birthdate: '030313' },
  { name: '이승현', birthdate: '881024' }, { name: '이예진', birthdate: '040118' },
  { name: '이요한', birthdate: '030213' }, { name: '이원우', birthdate: '050317' },
  { name: '이의진', birthdate: '010614' }, { name: '이재인', birthdate: '050317' },
  { name: '이재준', birthdate: '040514' }, { name: '이형석', birthdate: '000101' },
  { name: '이지훈', birthdate: '050421' }, { name: '이진명', birthdate: '990115' },
  { name: '이창희', birthdate: '000131' }, { name: '이하준', birthdate: '021010' },
  { name: '이현우', birthdate: '940125' }, { name: '이혜원', birthdate: '030413' },
  { name: '임수민', birthdate: '030228' }, { name: '장건우', birthdate: '060710' },
  { name: '장태경', birthdate: '071017' }, { name: '전다영', birthdate: '030304' },
  { name: '전광욱', birthdate: '931023' }, { name: '정성은', birthdate: '990424' },
  { name: '정성훈', birthdate: '000101' }, { name: '정세은', birthdate: '030723' },
  { name: '정세희', birthdate: '030102' }, { name: '정아름', birthdate: '970709' },
  { name: '조민지', birthdate: '010515' }, { name: '조재훈', birthdate: '971016' },
  { name: '조하윤', birthdate: '050714' }, { name: '조혜민', birthdate: '961212' },
  { name: '차이환', birthdate: '000101' }, { name: '채승아', birthdate: '990307' },
  { name: '채승안', birthdate: '031210' }, { name: '최승환', birthdate: '040508' },
  { name: '최아영', birthdate: '930826' }, { name: '최인영', birthdate: '911129' },
  { name: '최인혁', birthdate: '990508' }, { name: '하영은', birthdate: '950302' },
  { name: '하형준', birthdate: '971119' }, { name: '한지훈', birthdate: '021214' },
  { name: '허은영', birthdate: '020930' }, { name: '홍성인', birthdate: '000101' },
  { name: '홍성인', birthdate: '950303' }, { name: '황서영', birthdate: '020904' }
];

const DUMMY_PARTICIPANTS = Array.from({ length: 112 }, (_, i) => {
  if (i < RAW_PARTICIPANTS.length) {
    return {
      ...RAW_PARTICIPANTS[i],
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=participant${i + 1}`
    };
  }
  return {
    name: `참가자${i + 1}`,
    birthdate: `9001${String(i + 1).padStart(2, '0')}`,
    photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=participant${i + 1}`
  };
});

const handleAIGrouping = async (keywords: string[], membersPerGroup: number, totalGroups: number, apiKey: string) => {
  if (!apiKey) {
    alert("API 키가 설정되지 않았습니다. 관리자에게 문의하세요.");
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `
      다음은 수련회 참가자 총 ${DUMMY_PARTICIPANTS.length}명의 명단입니다:
      ${JSON.stringify(DUMMY_PARTICIPANTS.map(p => ({ name: p.name, birthdate: p.birthdate })))}
      
      관리자의 요구사항:
      1. 키워드: ${keywords.join(', ')} (이 키워드들의 의미와 분위기를 고려하여 조를 편성하세요)
      2. 조당 인원: 약 ${membersPerGroup}명
      3. 총 조의 개수: ${totalGroups}개
      
      위 요구사항에 맞춰 **반드시 ${DUMMY_PARTICIPANTS.length}명 전원을 단 한 명의 누락 없이** 그룹으로 나누어주세요. 
      결과는 반드시 다음 JSON 형식의 배열로만 답변하세요:
      [{"name": "이름", "birthdate": "생년월일", "groupId": 그룹번호(숫자)}]
      
      다른 설명 없이 오직 JSON 데이터만 출력하세요.
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("AI가 유효한 JSON 형식을 반환하지 않았습니다.");
    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error("Grouping Error:", error);
    alert(`그룹 편성 중 오류가 발생했습니다: ${error.message || "알 수 없는 오류"}`);
    return null;
  }
};

function App() {
  const [name, setName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [userId, setUserId] = useState<string | null>(null) // 유저 고유 ID
  const [currentPage, setCurrentPage] = useState<Page>('login')
  const [isRecapMode, setIsRecapMode] = useState(false)
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false)
  const [recapData, setRecapData] = useState<any>(null)
  const [recapStatus, setRecapStatus] = useState('')
  const [showRecapPreview, setShowRecapPreview] = useState(false)
  const [showGroupingAdmin, setShowGroupingAdmin] = useState(false) // 관리자 그룹 짜기 모달
  const [showMyGroup, setShowMyGroup] = useState(false) // 유저 그룹 확인 모달
  const [groupData, setGroupData] = useState<any>(null) // 전체 그룹 정보
  const [isGroupingDone, setIsGroupingDone] = useState(false)
  const [isProcessingGroups, setIsProcessingGroups] = useState(false)

  // Modal states
  const [showInfo, setShowInfo] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // Profile state
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isSharingRef = useRef(false) // 중복 공유 방지 즐시 잠금

  // Gallery state
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([])
  const galleryFileInputRef = useRef<HTMLInputElement>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null)

  // Prayer state
  const [newPrayer, setNewPrayer] = useState('')
  const [likedPrayers, setLikedPrayers] = useState<string[]>([])
  const [prayers, setPrayers] = useState<any[]>([])

  // 시스템 설정(리캡 모드) 실시간 리스너
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'config', 'system'), (doc) => {
      if (doc.exists()) {
        setIsRecapMode(doc.data().isRecapMode || false)
      }
    })
    return () => unsubscribe()
  }, [])

  // Firestore 실시간 리스너 설정
  useEffect(() => {
    const q = query(collection(db, 'prayers'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prayerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setPrayers(prayerList)
    })
    return () => unsubscribe()
  }, [])

  const handleAddPrayer = async () => {
    if (!newPrayer.trim() || !userId) return
    if (newPrayer.length > 30) {
      alert('기도제목은 30자 이내로 작성해주세요.')
      return
    }
    
    try {
      await addDoc(collection(db, 'prayers'), {
        content: `"${newPrayer}"`,
        likes: 0,
        createdAt: serverTimestamp(),
        authorId: userId, // 누구의 글인지 기록
        authorName: name
      })
      setNewPrayer('')
    } catch (error) {
      console.error("Error adding prayer:", error)
      alert("기도제목 저장 중 오류가 발생했습니다.")
    }
  }

  const handleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (likedPrayers.includes(id)) return;

    try {
      const prayerDoc = doc(db, 'prayers', id);
      await updateDoc(prayerDoc, {
        likes: increment(1)
      });
      
      setLikedPrayers(prev => [...prev, id]);
    } catch (error) {
      console.error("Error liking prayer:", error);
    }
  }

  // Gallery 실시간 리스너
  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photos = snapshot.docs.map(doc => doc.data().url)
      setGalleryPhotos(photos)
    })
    return () => unsubscribe()
  }, [])

  // 이미지 압축 함수 (Canvas 사용)
  const compressImage = (file: File, maxWidth: number = 1200): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            resolve(blob as Blob);
          }, 'image/jpeg', 0.7); // 70% 화질로 압축
        };
      };
    });
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && userId) {
      try {
        // 이미지 압축 진행
        const compressedBlob = await compressImage(file);
        
        // Storage에 업로드
        const storageRef = ref(storage, `gallery/${userId}_${Date.now()}.jpg`);
        const snapshot = await uploadBytes(storageRef, compressedBlob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        await addDoc(collection(db, 'gallery'), {
          url: downloadURL,
          authorId: userId,
          authorName: name,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Gallery Upload Error:", error);
      }
    }
  }

  // AI Chat state
  const [aiMessage, setAiMessage] = useState('')
  const [isLoadingAi, setIsLoadingAi] = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([
    {
      id: "1",
      sender: 'ai',
      text: '이곳은 당신의 생각과 마음을 나누는 평화로운 공간입니다. 오늘 어떤 마음을 나누고 싶으신가요? 기쁨도 좋고, 고민도 좋습니다. 제가 귀 기울여 듣겠습니다.',
      time: '방금 전'
    }
  ])

  // AI 채팅 실시간 리스너 (내 대화만 불러오기)
  useEffect(() => {
    if (!userId) return;
    
    const welcomeMsg = {
      id: "1",
      sender: 'ai',
      text: '이곳은 당신의 생각과 마음을 나누는 평화로운 공간입니다. 오늘 어떤 마음을 나누고 싶으신가요? 기쁨도 좋고, 고민도 좋습니다. 제가 귀 기울여 듣겠습니다.',
      time: '방금 전'
    };

    // 색인(Index) 문제를 피하기 위해 orderBy를 뺍니다.
    const q = query(collection(db, 'chats'), where('userId', '==', userId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dbMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // 시간순 정렬 (서버 타임스탬프 기준)
      dbMessages.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      });

      setChatHistory([welcomeMsg, ...dbMessages]);
    }, (error) => {
      console.error("Firestore Chat Listener Error:", error);
    });

    return () => unsubscribe();
  }, [userId])

  // 그룹 데이터 실시간 리스너
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'groups'), (doc) => {
      if (doc.exists()) {
        setGroupData(doc.data().assignments);
        setIsGroupingDone(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // 타이핑 효과용 상태

  const handleSendAiMessage = async () => {
    if (!aiMessage.trim() || isLoadingAi || !userId) return

    const userText = aiMessage;
    setAiMessage('')
    setIsLoadingAi(true)

    try {
      // 1. 사용자 메시지 Firestore 저장
      await addDoc(collection(db, 'chats'), {
        userId,
        sender: 'user',
        text: userText,
        createdAt: serverTimestamp(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

      if (!apiKey) throw new Error("API Key missing");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        systemInstruction: "당신은 '기쁨의동산교회 청년부 26년 여름수련회'의 도우미이자 따뜻한 상담가인 '빛.Ai'입니다. 사용자들에게 평안을 주고 신앙적인 조언과 따뜻한 위로를 제공하세요. 존댓말로 친절하게 답변해주세요. 답변은 너무 길지 않게 2~3문장으로 부탁합니다."
      });

      const chat = model.startChat({ 
        history: chatHistory
          .filter(msg => msg.id !== "1")
          .map(msg => ({
            role: msg.sender === '빛.Ai' ? 'model' : 'user',
            parts: [{ text: msg.text }]
          }))
      });
      
      const result = await chat.sendMessage(userText);
      const responseText = result.response.text();

      // 2. AI 답변 DB에 저장
      await addDoc(collection(db, 'chats'), {
        userId,
        sender: '빛.Ai',
        text: responseText,
        createdAt: serverTimestamp(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });

    } catch (error: any) {
      console.error("AI Error:", error);
    } finally {
      setIsLoadingAi(false)
    }
  }

  // 1. 리캡 데이터 생성 및 미리보기 열기
  const handleGenerateRecap = async () => {
    if (!userId) return;
    setIsGeneratingRecap(true);
    setRecapStatus('추억을 수집하고 있습니다...');

    try {
      const prayersQ = query(collection(db, 'prayers'), where('authorId', '==', userId));
      const galleryQ = query(collection(db, 'gallery'), where('authorId', '==', userId));
      const chatsQ = query(collection(db, 'chats'), where('userId', '==', userId));

      const [prayersSnap, gallerySnap, chatsSnap] = await Promise.all([
        getDocs(prayersQ),
        getDocs(chatsQ)
      ]);

      const gallerySnap = await getDocs(galleryQ);
      
      setRecapStatus('당신의 기록을 빛으로 변환하는 중...');

      const userPrayers = prayersSnap.docs.map(d => d.data().content);
      const userChats = chatsSnap.docs.map(d => d.data().text);

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const userChatTexts = userChats
        .filter((_, idx) => idx % 2 === 0 || idx % 2 === 1) // 유저+AI 대화 모두 포함
        .slice(-10)
        .join(' ');
      const prompt = `
        당신은 '기쁨의동산교회 청년부 26년 여름수련회'를 함께한 따뜻한 영적 동반자 '빛.Ai'입니다.

        아래는 수련회 참가자 ${name}님에 관한 정보입니다:
        - 기도제목: ${userPrayers.join(', ') || '(작성 없음)'}
        - 수련회 중 빛.Ai와 나눈 대화: ${userChatTexts || '(대화 없음)'}

        위 내용을 종합하여, ${name}님이 이번 수련회에서 느꼈을 감정과 내면의 상태를 깊이 이해하고,
        수련회를 마치며 그분에게 보내는 따뜻한 마무리 메시지를 써줘.

        반드시 포함해야 할 요소:
        1. 수련회 동안 ${name}님이 어떤 마음이었는지 공감하는 표현
        2. 그럼에도 빛으로 나아가고 있다는 따뜻한 격려
        3. 앞으로 세상의 빛으로 살아가기를 응원하는 마무리

        형식:
        - 존댓말, 3~4문장 이내
        - "안녕하세요", "안녕" 같은 인사말 절대 없이 바로 본론 시작
        - 설교나 교훈 말투 X, 진심 어린 친구이자 동반자의 말투로
        - 이름(${name})을 자연스럽게 한 번 포함
      `;

      const result = await model.generateContent(prompt);
      const message = result.response.text();

      // 사진: 캡처 안정성을 위해 Blob URL로 변환 시도 (CORS/Taint 방지)
      const rawPhotos = gallerySnap.docs.map(d => d.data().url).slice(0, 4);
      const photoUrls = await Promise.all(
        rawPhotos.map(async (url: string) => {
          try {
            const response = await fetch(url);
            const blob = await response.blob();
            return URL.createObjectURL(blob);
          } catch (e) {
            console.warn("Photo fetch failed, using raw URL", e);
            return url;
          }
        })
      );

      setRecapData({
        message,
        photos: photoUrls,
        prayers: userPrayers,
        date: new Date().toLocaleDateString()
      });
      
      setShowRecapPreview(true); // 미리보기 모달 열기
    } catch (error) {
      console.error("Recap Flow Error:", error);
      alert("리캡 생성 중 문제가 발생했습니다.");
    } finally {
      setIsGeneratingRecap(false);
      setRecapStatus('');
    }
  };

  // 2. 미리보기 캡처 → JPEG 단일 파일 공유
  const handleShareRecap = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const element = document.getElementById('recap-capture-area');
    if (!element || isSharingRef.current) return;
    
    isSharingRef.current = true;
    setIsGeneratingRecap(true);

    try {
      // 1. 모든 이미지 로딩 완료 대기
      const images = Array.from(element.getElementsByTagName('img'));
      await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));
      
      // 레이아웃 안정화 대기
      await new Promise(r => setTimeout(r, 800));

      const canvas = await html2canvas(element, {
        scale: 3, // 해상도 상향
        useCORS: true, // CORS 허용
        allowTaint: true, // Taint 허용 (blob 실패 시 fallback 작동)
        backgroundColor: '#fdfbf7',
        logging: false,
        width: element.scrollWidth,
        windowWidth: document.documentElement.scrollWidth,
        scrollY: 0,
        scrollX: 0,
      });

      // 2. Blob 생성 시도
      let blob: Blob | null = null;
      try {
        blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(), 'image/jpeg', 0.95);
        });
      } catch (e) {
        console.warn('toBlob failed, falling back to dataURL', e);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }

      if (!blob) throw new Error('blob 생성 실패');

      const fileName = `빛의자녀_${name}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const objectUrl = URL.createObjectURL(blob);

      // 3. 공유 또는 다운로드
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file]
          });
          // 공유 성공 시 즉시 종료 (중복 전송 방지)
          return;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            return; // 사용자가 취소한 경우 종료
          }
          console.error('Share failed, falling back to download', shareError);
        }
      }

      // navigator.share가 실패했거나 지원하지 않을 때만 다운로드 트리거
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup (약간의 지연 후)
      setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    } catch (error) {
      console.error('Share Error:', error);
      alert('공유 중 오류가 발생했습니다. \n클립보드 저장이나 스크린샷을 시도해주세요.');
    } finally {
      // 공유 프로세스 완료 후 충분한 지연 시간을 두어 중복 방지
      setTimeout(() => {
        isSharingRef.current = false;
        setIsGeneratingRecap(false);
      }, 2000);
    }
  };

  const toggleRecapMode = async () => {
    if (userId !== "박재형_940721") return; // 슈퍼 관리자 체크
    try {
      await setDoc(doc(db, 'config', 'system'), {
        isRecapMode: !isRecapMode
      }, { merge: true });
      alert(`리캡 모드가 ${!isRecapMode ? '활성화' : '비활성화'} 되었습니다.`);
    } catch (error) {
      console.error("Toggle Mode Error:", error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedBirth = birthdate.trim()
    
    const isValidUser = ALLOWED_USERS.some(
      user => user.name === trimmedName && user.birthdate === trimmedBirth
    );

    if (isValidUser) {
      const generatedId = `${trimmedName}_${trimmedBirth}`;
      setUserId(generatedId);
      
      // Firestore에서 기존 유저 정보(프로필 사진 등) 가져오기
      try {
        const userDoc = await getDoc(doc(db, 'users', generatedId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.profileImage) {
            setProfileImage(userData.profileImage);
          }
        } else {
          // 첫 로그인 시 유저 문서 생성
          await setDoc(doc(db, 'users', generatedId), {
            name: trimmedName,
            birthdate: trimmedBirth,
            createdAt: serverTimestamp()
          });
        }
        setCurrentPage('home')
      } catch (error) {
        console.error("Login Error:", error);
        alert('로그인 처리 중 오류가 발생했습니다.');
      }
    } else {
      alert('정보가 일치하지 않습니다.')
    }
  }

  const handleLogout = () => {
    setCurrentPage('login')
    setShowProfile(false)
    setName('')
    setBirthdate('')
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && userId) {
      try {
        const compressedBlob = await compressImage(file, 600); // 프로필은 더 작게 압축
        const storageRef = ref(storage, `profiles/${userId}`);
        const snapshot = await uploadBytes(storageRef, compressedBlob);
        const downloadURL = await getDownloadURL(snapshot.ref);

        setProfileImage(downloadURL);
        await updateDoc(doc(db, 'users', userId), {
          profileImage: downloadURL
        });
      } catch (error) {
        console.error("Error saving profile image:", error);
      }
    }
  }

  const handleResetGroups = async () => {
    if (!window.confirm("정말로 모든 그룹 데이터를 초기화하시겠습니까?")) return;
    try {
      await setDoc(doc(db, 'settings', 'groups'), {
        assignments: [],
        updatedAt: serverTimestamp(),
        isReset: true
      });
      setGroupData([]);
      alert("그룹 데이터가 초기화되었습니다.");
    } catch (error) {
      alert("초기화 중 오류가 발생했습니다.");
    }
  };

  const handleAIGroupingWrapper = async (keywords: string[], members: number, groups: number) => {
    return await handleAIGrouping(keywords, members, groups, apiKey);
  };

  // Sub-components moved outside

  if (currentPage === 'home') {
    return (
      <>
        <div className="bg-pattern" />
        <NavIcons 
          userId={userId} 
          isRecapMode={isRecapMode} 
          toggleRecapMode={toggleRecapMode} 
          setShowGroupingAdmin={setShowGroupingAdmin} 
          setShowInfo={setShowInfo} 
          setShowProfile={setShowProfile} 
        />

        <div className="auth-container" style={{ justifyContent: 'flex-start', paddingTop: '8vh' }}>
          <header className="header" style={{ marginTop: '0' }}>
            <div className="retreat-subtitle">기쁨의동산교회 청년부 26년 여름수련회</div>
            {isRecapMode ? (
              <h1 className="main-title" style={{ marginTop: '20px' }}>
                수련회의 모든 여정 속에<br />당신은 빛이었습니다.
              </h1>
            ) : (
              <h1 className="main-title">
                환영합니다!<br />함께 빛의 여정을 시작해볼까요?
              </h1>
            )}
            <div className="title-line"></div>
          </header>

          {isRecapMode ? (
            <div style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
              <div className="recap-launch-zone">
                <div className="recap-card" style={{ background: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(10px)', border: '1px solid rgba(117, 94, 34, 0.1)' }}>
                  <div className="recap-ready-view" style={{ padding: '40px 20px' }}>
                    <div style={{ marginBottom: '25px' }}>
                      <Sparkles size={48} color="#755e22" style={{ opacity: 0.8 }} />
                    </div>
                    <p style={{ whiteSpace: 'pre-line', marginBottom: '40px', color: '#666', fontSize: '15px', lineHeight: '1.7' }}>
                      {isGeneratingRecap ? recapStatus : '당신의 소중한 추억들을 한데 모아\n빛.Ai가 세상에 하나뿐인 선물을 준비했어요.'}
                    </p>
                    <button 
                      className="generate-btn" 
                      onClick={handleGenerateRecap}
                      disabled={isGeneratingRecap}
                      style={{ 
                        maxWidth: '400px', 
                        width: '100%',
                        height: '60px', 
                        fontSize: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '10px',
                        borderRadius: '15px',
                        border: 'none',
                        background: isGeneratingRecap ? '#ccc' : '#755e22',
                        color: '#fff',
                        fontWeight: '600',
                        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                    >
                      {isGeneratingRecap ? (
                        <div className="spinner-small" />
                      ) : (
                        <>
                          <Sparkles size={18} />
                          선물 확인하기
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="menu-grid">
              <div className="menu-card" onClick={() => isGroupingDone && setShowMyGroup(true)} style={{ opacity: isGroupingDone ? 1 : 0.5 }}>
                <Users className="icon" size={48} strokeWidth={1.5} />
              </div>
              <div className="menu-card" onClick={() => setCurrentPage('prayer')}>
                <Church className="icon" size={48} strokeWidth={1.5} />
              </div>
              <div className="menu-card" onClick={() => setCurrentPage('gallery')}>
                <ImageIcon className="icon" size={48} strokeWidth={1.5} />
              </div>
              <div className="menu-card accent" onClick={() => setCurrentPage('ai')}>
                <Sparkles className="icon" size={48} strokeWidth={1.5} />
              </div>
            </div>
          )}

          {userId === "박재형_940721" && (
            <div style={{ width: '100%', textAlign: 'center', marginBottom: '20px' }}>
              <button 
                onClick={handleResetGroups}
                style={{ background: 'none', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', cursor: 'pointer', opacity: 0.7 }}
              >
                그룹 데이터 초기화 (테스트용)
              </button>
            </div>
          )}
          <footer className="footer" style={{ position: 'absolute', bottom: '40px' }}>
            <div>Copyright: harryj</div>
            <div>Email: wogud9494@naver.com</div>
          </footer>
        </div>

        <InfoModal show={showInfo} onClose={() => setShowInfo(false)} />
        <ProfileModal 
          show={showProfile} 
          onClose={() => setShowProfile(false)} 
          name={name} 
          birthdate={birthdate} 
          profileImage={profileImage} 
          onLogout={handleLogout} 
          onUpload={handleImageUpload} 
          fileInputRef={fileInputRef} 
        />
        <GroupingAdminModal 
          show={showGroupingAdmin} 
          onClose={() => setShowGroupingAdmin(false)} 
          isProcessing={isProcessingGroups} 
          setIsProcessing={setIsProcessingGroups} 
          handleAIGrouping={handleAIGroupingWrapper} 
        />
        <MyGroupModal 
          show={showMyGroup} 
          onClose={() => setShowMyGroup(false)} 
          groupData={groupData} 
          userId={userId} 
          name={name} 
        />

        {/* 리캡 미리보기 모달 */}
        {showRecapPreview && recapData && (
          <div className="modal-overlay" style={{ 
            backgroundColor: 'rgba(0,0,0,0.95)', 
            zIndex: 5000, 
            display: 'block', // 스크롤을 위해 block 처리
            overflowY: 'auto', 
            padding: '40px 0' 
          }}>
            <div className="recap-preview-container" style={{ 
              width: '92%', 
              maxWidth: '500px', 
              margin: '0 auto',
              position: 'relative',
              backgroundColor: '#fdfbf7',
              borderRadius: '25px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              height: 'fit-content'
            }}>
              <button className="modal-close" onClick={() => setShowRecapPreview(false)} style={{ color: '#000', zIndex: 100, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: '50%', padding: '5px' }}>
                <X size={20} />
              </button>

              {/* 캡처 대상 영역 - 간지 나는 포스터 스타일 */}
              <div id="recap-capture-area" style={{ 
                width: '100%', 
                maxWidth: '500px', 
                margin: '0 auto',
                backgroundColor: '#fdfbf7',
                padding: '0',
                boxSizing: 'border-box',
                fontFamily: '"Apple SD Gothic Neo", "Malgun Gothic", serif',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* 1. 시네마틱 헤더 섹션 */}
                <div style={{ backgroundColor: '#755e22', color: '#fff', padding: '60px 40px', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#e0d5b1', letterSpacing: '4px', fontWeight: 'bold', marginBottom: '20px' }}>2026 RETREAT</p>
                  <h1 style={{ fontSize: '38px', fontWeight: '800', lineHeight: '1.2', marginBottom: '30px', letterSpacing: '-2px' }}>증인: 빛을 들고,<br />세상으로</h1>
                  <div style={{ width: '30px', height: '1px', backgroundColor: '#e0d5b1', margin: '0 auto 30px' }}></div>
                  <div style={{ fontSize: '14px', color: '#fdfbf7', display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0.9 }}>
                    <p><strong>일정</strong> 2026. 07. 09 — 07. 11</p>
                    <p><strong>장소</strong> 안성 영락수양관</p>
                  </div>
                </div>

                <div style={{ padding: '40px 30px', display: 'flex', flexDirection: 'column', gap: '45px' }}>
                  {/* 2. 나의 소망 */}
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '13px', color: '#755e22', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '20px' }}>나의 소망</h3>
                    <div style={{ fontSize: '20px', color: '#333', lineHeight: '1.7', fontStyle: 'italic', fontFamily: 'serif', padding: '0 10px' }}>
                      {recapData.prayers[0]
                        ? recapData.prayers[0].replace(/^"|"$/g, '')
                        : '하나님의 증인으로 살아가게 하소서.'}
                    </div>
                  </div>

                  {/* 3. 빛의 동역자들 */}
                  <div>
                    <h3 style={{ fontSize: '13px', color: '#755e22', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>빛의 동역자들</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
                      {ALLOWED_USERS.map((user, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fff', padding: '6px 12px', borderRadius: '30px', border: '1px solid #f0e6d2', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                          <CircleUser size={14} color="#755e22" />
                          <span style={{ fontSize: '13px', color: '#555', fontWeight: '500' }}>{user.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. 빛나는 순간들 - 개수별 블록 그리드 */}
                  <div>
                    <h3 style={{ fontSize: '13px', color: '#755e22', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>빛나는 순간들</h3>
                    {(() => {
                      const photos: string[] = recapData.photos || [];
                      const count = photos.length;
                      const imgStyle = (h: string): React.CSSProperties => ({ width: '100%', height: h, objectFit: 'cover', display: 'block' });
                      
                      if (count === 0) return (
                        <div style={{ height: '150px', backgroundColor: '#f9f6f0', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>아직 기록된 사진이 없습니다.</div>
                      );
                      
                      if (count === 1) return (
                        <div style={{ borderRadius: '20px', overflow: 'hidden', backgroundColor: '#f0e6d2' }}>
                          <img src={photos[0]} crossOrigin="anonymous" style={imgStyle('240px')} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                        </div>
                      );
                      
                      if (count === 2) return (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          {photos.map((u, i) => (
                            <div key={i} style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f0e6d2' }}>
                              <img src={u} crossOrigin="anonymous" style={imgStyle('200px')} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                            </div>
                          ))}
                        </div>
                      );
                      
                      if (count === 3) return (
                        <div style={{ display: 'flex', gap: '8px', height: '220px' }}>
                          <div style={{ flex: 2, borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f0e6d2' }}>
                            <img src={photos[0]} crossOrigin="anonymous" style={imgStyle('100%')} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[photos[1], photos[2]].map((u, i) => (
                              <div key={i} style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f0e6d2' }}>
                                <img src={u} crossOrigin="anonymous" style={imgStyle('100%')} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                      
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {photos.map((u, i) => (
                            <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', backgroundColor: '#f0e6d2' }}>
                              <img src={u} crossOrigin="anonymous" style={imgStyle('150px')} onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>


                  {/* 5. 빛.Ai의 한마디 */}
                  <div style={{ backgroundColor: '#fff', padding: '40px 30px', borderRadius: '30px', boxShadow: '0 15px 40px rgba(117, 94, 34, 0.05)', border: '1px solid #f0e6d2', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '20px', left: '25px', fontSize: '60px', color: '#e0d5b1', fontFamily: 'serif', lineHeight: 1 }}>"</div>
                    <div style={{ fontSize: '17px', color: '#444', lineHeight: '1.9', position: 'relative', zIndex: 1, textAlign: 'justify' }}>
                      {recapData.message}
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '30px', color: '#755e22', fontSize: '13px', fontWeight: 'bold', opacity: 0.6 }}>— 빛.Ai</div>
                  </div>

                  {/* 6. 푸터 */}
                  <div style={{ textAlign: 'center', marginTop: '20px', paddingBottom: '10px' }}>
                    <p style={{ color: '#755e22', fontSize: '15px', fontWeight: '600', lineHeight: '1.7', marginBottom: '8px', fontStyle: 'italic' }}>
                      "오직 성령이 너희에게 임하시면 너희가 권능을 받고<br />예루살렘과 온 유대와 사마리아와 땅 끝까지 이르러<br />내 증인이 되리라"
                    </p>
                    <p style={{ color: '#755e22', fontSize: '12px', fontWeight: 'bold', opacity: 0.7, letterSpacing: '1px' }}>— 사도행전 1장 8절</p>
                  </div>
                </div>
              </div>

              {/* 하단 톤앤매너 최적화 공유 버튼 */}
              <div style={{ 
                padding: '20px 30px 40px', 
                display: 'flex', 
                justifyContent: 'center', 
                background: 'linear-gradient(to top, #fdfbf7 90%, transparent)',
                position: 'sticky',
                bottom: '0',
                zIndex: 100
              }}>
                <button 
                  className="generate-btn" 
                  onClick={(e) => handleShareRecap(e)} 
                  disabled={isGeneratingRecap}
                  style={{ 
                    maxWidth: '400px', 
                    width: '100%',
                    height: '60px', 
                    fontSize: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '10px',
                    borderRadius: '15px',
                    border: 'none',
                    background: isGeneratingRecap ? '#ccc' : '#755e22',
                    color: '#fff',
                    fontWeight: '600',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  {isGeneratingRecap ? (
                    <div className="spinner-small" />
                  ) : (
                    <>
                      <Send size={18} />
                      추억 공유하기
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </>
    )
  }

  if (currentPage === 'prayer') {
    return (
      <>
        <div className="bg-pattern" />
        <div className="top-nav">
          <ChevronLeft className="nav-back" size={28} onClick={() => setCurrentPage('home')} />
        </div>

        <div className="prayer-container">
          <header className="prayer-header">
            <h1>기도제목</h1>
            <p>당신의 소중한 마음을 빛의 자녀들과 나누어 보세요.</p>
          </header>

          <section className="write-section">
            <h2>나의 기도제목 쓰기</h2>
            <div className="input-with-icon">
              <input
                type="text"
                placeholder="마음을 담은 한 문장을 적어주세요 (30자 제한)"
                value={newPrayer}
                maxLength={30}
                onChange={(e) => setNewPrayer(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddPrayer()}
              />
              <Send className="send-icon" size={20} onClick={handleAddPrayer} />
            </div>
            <div className="write-footer">익명으로 따뜻한 위로가 전달됩니다.</div>
          </section>

          <section className="list-section">
            <div className="list-title">
              익명의 기도제목들 <Church size={16} />
            </div>

            <div className="prayer-list">
              {prayers.map((prayer) => (
                <div key={prayer.id} className="prayer-card">
                  <div className="content">{prayer.content}</div>
                  <div className="actions" onClick={(e) => handleLike(prayer.id, e)} style={{ cursor: likedPrayers.includes(prayer.id) ? 'default' : 'pointer' }}>
                    <Heart size={14} className={likedPrayers.includes(prayer.id) ? 'heart-filled' : ''} /> {prayer.likes}명이 함께 기도해요
                  </div>
                </div>
              ))}

              <div className="prayer-card image-bg" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1514894780063-587428b5aee6?auto=format&fit=crop&q=80&w=1000)' }}>
                <div className="content">"우리가 서로 사랑할 때, 그 빛은 더욱 밝아집니다."</div>
              </div>
            </div>
          </section>

          <footer className="footer" style={{ marginTop: '80px', position: 'relative', bottom: '0' }}>
            <div>Copyright: harryj</div>
            <div>Email: wogud9494@naver.com</div>
          </footer>
        </div>
      </>
    )
  }

  if (currentPage === 'gallery') {
    return (
      <>
        <div className="bg-pattern" />
        <div className="top-nav">
          <ChevronLeft className="nav-back" size={28} onClick={() => setCurrentPage('home')} />
        </div>

        <div className="gallery-container">
          <div className="gallery-header-card">
            <div className="gallery-header-icon">
              <Camera size={24} style={{ color: '#755e22' }} />
            </div>
            <h1>우리의 빛나는 순간들</h1>
            <p>수련회에서의 소중한 추억을 함께 나누어 보세요.</p>
            <button className="upload-btn" onClick={() => galleryFileInputRef.current?.click()}>
              사진 올리기
            </button>
            <input
              type="file"
              ref={galleryFileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              onChange={handleGalleryUpload}
            />
          </div>

          <div className="photo-grid">
            {galleryPhotos.map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`Moment ${index + 1}`}
                onClick={() => setSelectedPhoto(photo)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>

          <footer className="footer" style={{ marginTop: '80px', position: 'relative', bottom: '0' }}>
            <div>Copyright: harryj</div>
            <div>Email: wogud9494@naver.com</div>
          </footer>
        </div>

        {selectedPhoto && (
          <div className="photo-modal-overlay" onClick={() => setSelectedPhoto(null)}>
            <div className="photo-modal-content" onClick={e => e.stopPropagation()}>
              <button className="photo-modal-close" onClick={() => setSelectedPhoto(null)}>
                <X size={24} />
              </button>
              <img src={selectedPhoto} alt="Selected moment" />
            </div>
          </div>
        )}
      </>
    )
  }

  if (currentPage === 'ai') {
    return (
      <>
        <div className="bg-pattern" />
        <div className="top-nav">
          <ChevronLeft className="nav-back" size={28} onClick={() => setCurrentPage('home')} />
        </div>

        <div className="ai-container">
          <header className="ai-header">
            <div className="ai-header-icon">
              <Sparkles size={28} style={{ color: '#755e22' }} />
            </div>
            <h1>빛.Ai</h1>
            <p>오늘 빛.Ai에게 어떤 이야기를 들려주고 싶으신가요?</p>
          </header>

          <div className="chat-history">
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`chat-bubble-wrapper ${msg.sender}`}>
                <div className="chat-bubble">
                  {msg.text}
                </div>
                <div className="chat-meta">
                  {msg.sender === 'ai' ? '빛.ai' : '나'} • {msg.time}
                </div>
              </div>
            ))}
          </div>

          <div className="chat-input-wrapper">
            <input
              type="text"
              placeholder={isLoadingAi ? "빛.Ai가 생각중입니다..." : "당신의 마음을 들려주세요..."}
              value={aiMessage}
              onChange={(e) => setAiMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendAiMessage()}
              disabled={isLoadingAi}
            />
            <button
              className="chat-send-btn"
              onClick={handleSendAiMessage}
              disabled={isLoadingAi}
              style={{ opacity: isLoadingAi ? 0.5 : 1 }}
            >
              <Send size={18} />
            </button>
          </div>

          <footer className="footer" style={{ marginTop: '20px', position: 'relative', bottom: '0' }}>
            <div>Copyright: harryj</div>
            <div>Email: wogud9494@naver.com</div>
          </footer>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="bg-pattern" />
      <div className="auth-container">
        <header className="header">
          <div className="retreat-subtitle">기쁨의동산교회 청년부 26년 여름수련회</div>
          <h1 className="main-title">
            증인: 빛을 들고,<br />세상으로
          </h1>
          <p className="scripture">
            "오직 성령이 너희에게 임하시면 너희가 권능을 받고 예루살렘과 온 유대와 사마리아와 땅 끝까지 이르러 내 증인이 되리라 하시니라"
          </p>
          <div className="scripture-ref">사도행전 1:8</div>
        </header>

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">이름</label>
            <input
              type="text"
              className="input-field"
              placeholder="성함 입력"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">생년월일</label>
            <input
              type="text"
              className="input-field"
              placeholder="YYMMDD"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
            />
          </div>

          <button type="submit" className="submit-btn">
            입장하기 <span>&gt;</span>
          </button>
        </form>

        <footer className="footer">
          <div>Copyright: harryj</div>
          <div>Email: wogud9494@naver.com</div>
        </footer>
      </div>
    </>
  )
}

interface NavIconsProps {
  userId: string | null;
  isRecapMode: boolean;
  toggleRecapMode: () => void;
  setShowGroupingAdmin: (val: boolean) => void;
  setShowInfo: (val: boolean) => void;
  setShowProfile: (val: boolean) => void;
}

const NavIcons = ({ userId, isRecapMode, toggleRecapMode, setShowGroupingAdmin, setShowInfo, setShowProfile }: NavIconsProps) => (
  <nav className="navbar">
    {userId === "박재형_940721" && (
      <>
        <Users 
          className="nav-icon" 
          size={24} 
          onClick={() => setShowGroupingAdmin(true)} 
          style={{ marginRight: '8px' }} 
        />
        <Sparkles 
          className="nav-icon" 
          size={24} 
          onClick={toggleRecapMode} 
          style={{ color: isRecapMode ? '#ff4d4d' : 'inherit' }} 
        />
      </>
    )}
    <Info className="nav-icon" size={24} onClick={() => setShowInfo(true)} />
    <CircleUser className="nav-icon" size={24} onClick={() => setShowProfile(true)} />
  </nav>
);

interface ModalProps {
  show: boolean;
  onClose: () => void;
}

const InfoModal = ({ show, onClose }: ModalProps) => (
  show && (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={24} /></button>
        <h2 className="profile-name">접속 QR 코드</h2>
        <p className="profile-birth">모바일에서 스캔하여 접속하세요</p>
        <div className="qr-container">
          <QRCodeCanvas value={window.location.href} size={200} bgColor={"#ffffff"} fgColor={"#755e22"} level={"H"} />
        </div>
      </div>
    </div>
  )
);

interface ProfileModalProps {
  show: boolean;
  onClose: () => void;
  name: string;
  birthdate: string;
  profileImage: string | null;
  onLogout: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

const ProfileModal = ({ show, onClose, name, birthdate, profileImage, onLogout, onUpload, fileInputRef }: ProfileModalProps) => (
  show && (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X size={24} /></button>
        <div className="profile-pic-container" onClick={() => fileInputRef.current?.click()}>
          {profileImage ? <img src={profileImage} alt="Profile" /> : <CircleUser size={110} strokeWidth={0.5} className="nav-icon" />}
          <div className="profile-pic-overlay"><Camera size={24} /></div>
        </div>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={onUpload} />
        <div className="profile-info">
          <div className="profile-name">{name}</div>
          <div className="profile-birth">{birthdate}</div>
        </div>
        <button className="submit-btn logout-btn" onClick={onLogout} style={{ marginTop: '20px', backgroundColor: '#ff4d4d', color: 'white' }}>로그아웃</button>
      </div>
    </div>
  )
);

interface GroupingAdminModalProps {
  show: boolean;
  onClose: () => void;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
  handleAIGrouping: (keywords: string[], members: number, groups: number) => Promise<any>;
}

const GroupingAdminModal = ({ show, onClose, isProcessing, setIsProcessing, handleAIGrouping }: GroupingAdminModalProps) => {
  const [keyword1, setKeyword1] = useState("");
  const [keyword2, setKeyword2] = useState("");
  const [keyword3, setKeyword3] = useState("");
  const [membersPerGroup, setMembersPerGroup] = useState(5);
  const [totalGroups, setTotalGroups] = useState(20);
  
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'result'>('grid');
  const [localAssignments, setLocalAssignments] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const onRunGrouping = async () => {
    const keywords = [keyword1, keyword2, keyword3].filter(k => k.trim() !== "");
    if (keywords.length === 0) {
      alert("최소 하나 이상의 키워드를 입력해주세요.");
      return;
    }
    
    setIsScanning(true);
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 4000));
    try {
      const assignments = await handleAIGrouping(keywords, membersPerGroup, totalGroups);
      if (assignments) {
        setLocalAssignments(assignments);
        setViewMode('result');
      }
    } finally {
      setIsScanning(false);
      setIsProcessing(false);
    }
  };

  const handleConfirmGroups = async () => {
    if (localAssignments.length === 0) return;
    setIsProcessing(true);
    try {
      await setDoc(doc(db, 'settings', 'groups'), {
        assignments: localAssignments,
        updatedAt: serverTimestamp(),
        config: {
          keywords: [keyword1, keyword2, keyword3],
          membersPerGroup,
          totalGroups
        }
      });
      alert("그룹이 최종 확정되었습니다!");
      onClose();
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
    }
  };

  const groupedMembers = localAssignments.reduce((acc: any, cur: any) => {
    const gid = cur.groupId;
    if (!acc[gid]) acc[gid] = [];
    acc[gid].push(cur);
    return acc;
  }, {});

  const sortedGroupIds = Object.keys(groupedMembers).sort((a, b) => Number(a) - Number(b));

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" style={{ zIndex: 2000, background: 'rgba(253, 251, 247, 0.98)', backdropFilter: 'blur(15px)' }} onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 30, opacity: 0 }} className="modal-content" style={{ maxWidth: '1200px', width: '95%', height: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fff', border: '1px solid rgba(117, 94, 34, 0.1)', boxShadow: '0 50px 100px rgba(0,0,0,0.15)', position: 'relative' }} onClick={e => e.stopPropagation()}>
            
            {/* Top Right Utilities: Registration Count & Close Button */}
            <div style={{ position: 'absolute', top: '30px', right: '30px', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 100 }}>
              <div style={{ background: '#fdfbf7', color: '#8b7e58', padding: '10px 20px', borderRadius: '15px', fontSize: '14px', fontWeight: '800', border: '1px solid #e6e0d5', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                등록 인원: {DUMMY_PARTICIPANTS.length}명
              </div>
              <button 
                onClick={onClose}
                style={{ background: '#f5f0e6', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#755e22', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
              >
                <X size={26} />
              </button>
            </div>

            <div style={{ padding: '60px 20px 40px', textAlign: 'center', borderBottom: '1px solid #f9f6f0' }}>
              <h2 style={{ color: '#755e22', fontFamily: 'serif', fontSize: '42px', margin: 0, letterSpacing: '-1.5px', whiteSpace: 'nowrap' }}>빛의 동역자</h2>
              <p style={{ color: '#a09478', fontSize: '17px', marginTop: '12px', fontWeight: '500', margin: '12px 0 0' }}>서로가 서로의 빛이 되는 소중한 만남</p>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', width: '100%', padding: '20px 40px', position: 'relative' }}>
              <AnimatePresence>
                {viewMode === 'grid' ? (
                  <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'relative' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '12px' }}>
                          {DUMMY_PARTICIPANTS.map((p, i) => (
                            <motion.div key={`p-${i}`} layoutId={`photo-${p.name}_${p.birthdate}`} onClick={() => setPreviewPhoto(p.photoUrl)} style={{ cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                              <motion.img 
                                src={p.photoUrl} 
                                style={{ width: '100%', borderRadius: '15px', border: '1px solid #f0e6d2' }} 
                            animate={isScanning ? { 
                              filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'], 
                              scale: [1, 1.08, 1], 
                              borderColor: ['#f0e6d2', '#755e22', '#f0e6d2'] 
                            } : {}} 
                            transition={isScanning ? { repeat: Infinity, duration: 2, delay: i * 0.02 } : {}} 
                            alt={p.name} 
                          />
                          <div style={{ fontSize: '11px', marginTop: '6px', color: '#8b7e58', fontWeight: '500' }}>{p.name.split('_')[0]}</div>
                        </motion.div>
                      ))}
                    </div>
                    {isScanning && <motion.div className="premium-scan-line" initial={{ top: '-10%' }} animate={{ top: '110%' }} transition={{ duration: 4, ease: "linear", repeat: Infinity }} />}
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '30px', paddingBottom: '120px' }}>
                    {sortedGroupIds.map((gid) => (
                      <motion.div key={`g-${gid}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} style={{ background: '#fdfbf7', borderRadius: '30px', padding: '25px', border: '1px solid #f0e6d2', boxShadow: '0 15px 35px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#755e22', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>{gid}</div>
                          <h3 style={{ fontSize: '20px', color: '#755e22', margin: 0, fontFamily: 'serif' }}>조 동역자</h3>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                          {groupedMembers[gid].map((member: any, idx: number) => {
                            const participant = DUMMY_PARTICIPANTS.find(p => p.name === member.name && p.birthdate === member.birthdate);
                            return (
                              <motion.div key={`m-${gid}-${idx}`} layoutId={`photo-${member.name}_${member.birthdate}`} style={{ textAlign: 'center' }}>
                                <img src={participant?.photoUrl} style={{ width: '100%', borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 6px 15px rgba(0,0,0,0.1)' }} alt={member.name} />
                                <div style={{ fontSize: '12px', marginTop: '8px', color: '#444', fontWeight: '600' }}>{member.name}</div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div style={{ padding: '25px 40px 45px', background: '#fff', borderTop: '1px solid #f0f0f0', boxShadow: '0 -10px 40px rgba(0,0,0,0.02)', position: 'relative', zIndex: 10 }}>
              {viewMode === 'grid' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    {[setKeyword1, setKeyword2, setKeyword3].map((setK, idx) => (
                      <input 
                        key={idx}
                        type="text" 
                        placeholder={`키워드 ${idx + 1}`}
                        value={[keyword1, keyword2, keyword3][idx]}
                        onChange={(e) => setK(e.target.value)}
                        style={{ flex: 1, padding: '18px 25px', borderRadius: '15px', border: '1px solid #e6e0d5', fontSize: '15px', outline: 'none', background: '#fdfbf7' }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>조당 인원</span>
                      <input 
                        type="number" 
                        value={membersPerGroup}
                        onChange={(e) => setMembersPerGroup(Number(e.target.value))}
                        style={{ width: '70px', padding: '12px', borderRadius: '12px', border: '1px solid #e6e0d5', textAlign: 'center', fontSize: '16px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                      <span style={{ fontSize: '14px', color: '#666', fontWeight: '600' }}>총 조 개수</span>
                      <input 
                        type="number" 
                        value={totalGroups}
                        onChange={(e) => setTotalGroups(Number(e.target.value))}
                        style={{ width: '70px', padding: '12px', borderRadius: '12px', border: '1px solid #e6e0d5', textAlign: 'center', fontSize: '16px' }}
                      />
                    </div>
                    <button onClick={onRunGrouping} disabled={isProcessing} style={{ padding: '18px 60px', borderRadius: '18px', background: '#755e22', color: '#fff', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 12px 30px rgba(117, 94, 34, 0.25)', transition: 'all 0.3s' }}>
                      {isProcessing ? <div className="spinner-small" style={{ borderTopColor: '#fff' }} /> : "그룹 짜기"}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '20px' }}>
                  <button onClick={() => setViewMode('grid')} style={{ flex: 1, padding: '24px', borderRadius: '20px', border: '2px solid #755e22', color: '#755e22', background: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', whiteSpace: 'nowrap' }}>다시 설정하기</button>
                  <button onClick={handleConfirmGroups} disabled={isProcessing} style={{ flex: 2, padding: '24px', borderRadius: '20px', border: 'none', color: '#fff', background: '#755e22', cursor: 'pointer', fontWeight: 'bold', fontSize: '18px', boxShadow: '0 15px 35px rgba(117, 94, 34, 0.35)' }}>
                    {isProcessing ? <div className="spinner-small" style={{ margin: '0 auto', borderTopColor: '#fff' }} /> : "이대로 그룹 확정하기"}
                  </button>
                </div>
              )}
            </div>
            <AnimatePresence>
              {previewPhoto && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(30px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} onClick={() => setPreviewPhoto(null)}>
                  <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} style={{ position: 'relative', maxWidth: '550px', width: '90%' }}>
                    <img src={previewPhoto} style={{ width: '100%', borderRadius: '50px', boxShadow: '0 50px 120px rgba(0,0,0,0.12)' }} alt="Preview" />
                    <button style={{ position: 'absolute', top: '30px', right: '30px', background: 'rgba(0,0,0,0.06)', border: 'none', borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setPreviewPhoto(null)}><X size={28} color="#666" /></button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <style>{`
            .premium-scan-line { position: absolute; left: 0; right: 0; height: 100px; background: linear-gradient(to bottom, transparent, rgba(117, 94, 34, 0.05), rgba(117, 94, 34, 0.3), rgba(117, 94, 34, 0.05), transparent); border-top: 3px solid rgba(117, 94, 34, 0.6); z-index: 5; pointer-events: none; }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface MyGroupModalProps {
  show: boolean;
  onClose: () => void;
  groupData: any;
  userId: string | null;
  name: string;
}

const MyGroupModal = ({ show, onClose, groupData, userId, name }: MyGroupModalProps) => {
  if (!groupData || !userId) return null;
  const myAssignment = groupData.find((a: any) => `${a.name}_${a.birthdate}` === userId);
  if (!myAssignment) return (
    show && (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
          <p>아직 그룹이 편성되지 않았거나 명단에 없습니다.</p>
        </div>
      </div>
    )
  );
  const myGroupMembers = groupData.filter((a: any) => a.groupId === myAssignment.groupId);
  return (
    show && (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}><X size={24} /></button>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ color: '#755e22' }}>나의 그룹: {myAssignment.groupId}조</h2>
            <p style={{ color: '#666', fontSize: '14px' }}>함께 빛의 여정을 떠날 동역자들입니다.</p>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {myGroupMembers.map((member: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: '#f9f6f0', borderRadius: '15px' }}>
                <CircleUser size={24} color="#755e22" />
                <span style={{ fontWeight: '600' }}>{member.name.split('_')[0]}</span>
                {member.name === name && <span style={{ fontSize: '10px', color: '#755e22', background: '#fff', padding: '2px 6px', borderRadius: '10px' }}>나</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  );
};

export default App
