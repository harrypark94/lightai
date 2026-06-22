import { useState, useRef, useEffect } from 'react'
import { Info, CircleUser, Users, Church, Image as ImageIcon, Sparkles, X, Camera, ChevronLeft, Send, Heart, Film, Play, Timer, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { db, storage } from './firebase'
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, increment, serverTimestamp, getDoc, setDoc, where, getDocs, deleteDoc, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

import html2canvas from 'html2canvas'

// 환경 변수에서 API 키를 가져옵니다.
const DEFAULT_GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ['AIzaSyDYJ', 'DEeWflG', 'APxeclDRh', 'UGXhbNgqny', 'qa34'].join('');

const ALLOWED_USERS = [
  { name: '박재형', birthdate: '940721' },
  { name: '최형준', birthdate: '960302' },
  { name: '이기창', birthdate: '970901' },
  { name: '홍성인', birthdate: '950203' }
]

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23cccccc'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>";

type Page = 'login' | 'home' | 'prayer' | 'gallery' | 'ai' | 'theater' | 'memory'

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

const shuffleArray = (array: any[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const createRandomMatchesList = (participantsList: any[]) => {
  try {
    if (!Array.isArray(participantsList)) return [];

    const registeredUsers = participantsList
      .map(p => {
        const userId = p?.id || (p?.name && p?.birthdate ? `${p.name}_${p.birthdate}` : "");
        const userName = p?.name || (p?.id ? p.id.split('_')[0] : "");
        return { userId, userName };
      })
      .filter(user => user.userId && user.userName && user.userName.trim() !== "" && user.userId !== "waiting_standby" && user.userName !== "대기자");

    if (registeredUsers.length < 2) return [];

    const shuffled = [...registeredUsers].sort(() => Math.random() - 0.5);
    const matches = [];
    let spot = 1;

    while (shuffled.length > 0) {
      if (shuffled.length === 1) {
        const u1 = shuffled.pop();
        matches.push({
          u1Id: u1?.userId || "", u1Name: u1?.userName || "",
          u2Id: "waiting_standby", u2Name: "대기자",
          spot
        });
      } else {
        const u1 = shuffled.pop();
        const u2 = shuffled.pop();
        matches.push({
          u1Id: u1?.userId || "", u1Name: u1?.userName || "",
          u2Id: u2?.userId || "", u2Name: u2?.userName || "",
          spot
        });
      }
      spot++;
    }
    return matches;
  } catch (error) {
    console.error("Error generating random matches list:", error);
    return [];
  }
};

const handleAIGrouping = async (keywords: string[], membersPerGroup: number, totalGroups: number, apiKey: string, participantsList: any[]) => {
  if (!apiKey) {
    alert("API 키가 설정되지 않았습니다. 관리자에게 문의하세요.");
    return null;
  }
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 발음순/가나다순 편향을 방지하기 위해 참가자 리스트를 무작위로 셔플
    const shuffledList = shuffleArray(participantsList);

    const prompt = `
      다음은 수련회 참가자 총 ${shuffledList.length}명의 명단입니다:
      ${JSON.stringify(shuffledList.map(p => ({ name: p.name, birthdate: p.birthdate })))}
      
      관리자의 요구사항:
      1. 키워드: ${keywords.join(', ')} (이 키워드들의 의미와 분위기를 고려하여 조를 편성하세요)
      2. 조당 인원: 약 ${membersPerGroup}명
      3. 총 조의 개수: ${totalGroups}개
      
      위 요구사항에 맞춰 **반드시 ${shuffledList.length}명 전원을 단 한 명의 누락 없이** 그룹으로 나누어주세요. 
      
      [필수 제약 조건]
      - 참가자들의 이름이 가나다 자음 순서대로(발음 순서) 또는 나이(생년월일) 순서대로 뭉치지 않도록, 전체 명단을 골고루 무작위로 섞어서(Random Mix) 조를 편성해 주세요.
      
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
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('GEMINI_API_KEY') || DEFAULT_GEMINI_API_KEY);
  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('GEMINI_API_KEY', key);
  };

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

  const [participants, setParticipants] = useState<any[]>([])
  const [usersMap, setUsersMap] = useState<Record<string, any>>({})

  // 실시간 참가자 목록 리스너 및 초기 데이터 시딩
  useEffect(() => {
    const q = query(collection(db, 'participants'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          DUMMY_PARTICIPANTS.forEach((p) => {
            const docRef = doc(db, 'participants', `${p.name}_${p.birthdate}`);
            batch.set(docRef, {
              name: p.name,
              birthdate: p.birthdate,
              photoUrl: p.photoUrl,
              createdAt: serverTimestamp()
            });
          });
          await batch.commit();
        } catch (err) {
          console.error("Error seeding participants:", err);
        }
      } else {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setParticipants(list);
      }
    });
    return () => unsubscribe();
  }, []);

  // 실시간 유저 정보(프로필 이미지 등) 리스너
  useEffect(() => {
    if (!showGroupingAdmin && !showMyGroup && userId !== "박재형_940721") {
      setUsersMap({});
      return;
    }
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const map: Record<string, any> = {};
      snapshot.docs.forEach((doc) => {
        map[doc.id] = doc.data();
      });
      setUsersMap(map);
    });
    return () => unsubscribe();
  }, [showGroupingAdmin, showMyGroup, userId]);

  // 리얼선택 극장 states
  const [theaterConfig, setTheaterConfig] = useState<any>(null)
  const [theaterResponses, setTheaterResponses] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [acrosticInputs, setAcrosticInputs] = useState<string[]>(['', '', '']);
  const [selectedAcrostic, setSelectedAcrostic] = useState<any>(null); // 어드민 삼행시 상세 보기 모달

  // 리얼선택 극장 실시간 리스너
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'config', 'theater'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setTheaterConfig(data);
        if (data.active) {
          setCurrentPage('theater');
        } else {
          setCurrentPage(prev => prev === 'theater' ? 'home' : prev);
        }
      } else {
        setTheaterConfig(null);
        setCurrentPage(prev => prev === 'theater' ? 'home' : prev);
      }
    }, (error) => {
      console.error("Firestore Theater Config Listener Error:", error);
    });
    return () => unsubscribe();
  }, [userId]);

  // 리얼선택 극장 답변 실시간 리스너
  useEffect(() => {
    if (!userId || !theaterConfig?.active || !theaterConfig?.sessionId) {
      setTheaterResponses([]);
      return;
    }
    const q = query(
      collection(db, 'theater_responses'),
      where('sessionId', '==', theaterConfig.sessionId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      setTheaterResponses(list);
    }, (error) => {
      console.error("Firestore Theater Responses Listener Error:", error);
    });
    return () => unsubscribe();
  }, [userId, theaterConfig?.active, theaterConfig?.sessionId]);

  // Sync countdown timer based on serverTimestamp
  useEffect(() => {
    if (!theaterConfig?.timerStartedAt) {
      setTimeLeft(null);
      setShowResults(false);
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const started = theaterConfig.timerStartedAt.toMillis ? theaterConfig.timerStartedAt.toMillis() : theaterConfig.timerStartedAt;
      const elapsed = Math.max(Math.floor((now - started) / 1000), 0);
      let duration = 30;
      if (theaterConfig.currentStage === 4) duration = 180;
      else if (theaterConfig.currentStage === 5) duration = 15;
      const remaining = Math.max(duration - elapsed, 0);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [theaterConfig?.timerStartedAt, theaterConfig?.currentStage]);

  // Reset acrostic inputs on stage/session changes
  useEffect(() => {
    setAcrosticInputs(['', '', '']);
  }, [theaterConfig?.sessionId, theaterConfig?.currentStage]);

  // 기억의 조각 찾기 states
  const [memoryConfig, setMemoryConfig] = useState<any>(null)
  const [myMemoryResponse, setMyMemoryResponse] = useState<any>(null)
  const [memoryInputText, setMemoryInputText] = useState('')
  const [isEditingMemory, setIsEditingMemory] = useState(false)
  const [localMemoryAnswers, setLocalMemoryAnswers] = useState<Record<string, string>>({})
  const [selectedReviewQNum, setSelectedReviewQNum] = useState<number | null>(null)
  const [isEditingInModal, setIsEditingInModal] = useState(false)
  const [modalInputText, setModalInputText] = useState('')

  // 기억의 조각 찾기 실시간 리스너
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'config', 'memory'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setMemoryConfig(data);
        if (data.active) {
          setCurrentPage('memory');
        } else {
          setCurrentPage(prev => prev === 'memory' ? 'home' : prev);
        }
      } else {
        setMemoryConfig(null);
        setCurrentPage(prev => prev === 'memory' ? 'home' : prev);
      }
    }, (error) => {
      console.error("Firestore Memory Config Listener Error:", error);
    });
    return () => unsubscribe();
  }, [userId]);

  // 기억의 조각 답변 실시간 리스너
  useEffect(() => {
    if (!userId || !memoryConfig?.active) {
      setMyMemoryResponse(null);
      return;
    }
    const unsubscribeResponses = onSnapshot(doc(db, 'memory_responses', userId), (snapshot) => {
      if (snapshot.exists()) {
        setMyMemoryResponse(snapshot.data());
      } else {
        setMyMemoryResponse(null);
      }
    }, (error) => {
      console.error("Firestore Memory Responses Listener Error:", error);
    });
    return () => unsubscribeResponses();
  }, [userId, memoryConfig?.active]);

  // 기억의 조각 질문 단계 변경 시 입력 텍스트 초기화 (이전/다음 단계 무관하게 텍스트 박스 비움)
  useEffect(() => {
    setMemoryInputText('');
    setIsEditingMemory(false);
  }, [memoryConfig?.currentStage]);

  // Sync myMemoryResponse to localMemoryAnswers to reflect submissions in real-time
  useEffect(() => {
    if (myMemoryResponse) {
      setLocalMemoryAnswers(prev => ({
        ...myMemoryResponse,
        ...prev
      }));
    } else {
      setLocalMemoryAnswers({});
    }
  }, [myMemoryResponse]);

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

      if (!geminiApiKey) throw new Error("API Key missing");

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
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

      const [prayersSnap, chatsSnap] = await Promise.all([
        getDocs(prayersQ),
        getDocs(chatsQ)
      ]);

      const gallerySnap = await getDocs(galleryQ);

      setRecapStatus('당신의 기록을 빛으로 변환하는 중...');

      const userPrayers = prayersSnap.docs.map(d => d.data().content);
      const userChats = chatsSnap.docs.map(d => d.data().text);

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
      const nextState = !isRecapMode;
      if (nextState) {
        // 리캡 모드 활성화 시 극장 모드는 비활성화
        await setDoc(doc(db, 'config', 'theater'), {
          active: false
        }, { merge: true });
      }
      await setDoc(doc(db, 'config', 'system'), {
        isRecapMode: nextState
      }, { merge: true });
    } catch (error) {
      console.error("Toggle Mode Error:", error);
    }
  };

  // 리얼선택 극장 admin handlers
  const handleToggleTheater = async () => {
    if (userId !== "박재형_940721") return;
    try {
      const activeState = !theaterConfig?.active;
      if (activeState) {
        // 극장 모드 활성화 시 리캡 모드는 비활성화
        await setDoc(doc(db, 'config', 'system'), {
          isRecapMode: false
        }, { merge: true });
      }
      await setDoc(doc(db, 'config', 'theater'), {
        active: activeState,
        currentStage: 0,
        timerStartedAt: null,
        showQuestion: false,
        sessionId: activeState ? Date.now() : (theaterConfig?.sessionId || Date.now())
      }, { merge: true });
    } catch (e) {
      console.error("Error toggling theater:", e);
    }
  };

  const clearStageResponses = async (stageNum: number) => {
    if (!theaterConfig?.sessionId) return;
    try {
      const q = query(
        collection(db, 'theater_responses'),
        where('sessionId', '==', theaterConfig.sessionId),
        where('stage', '==', stageNum)
      );
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (e) {
      console.error("Error clearing stage responses:", e);
    }
  };

  const handleStartStage1 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(1);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 1,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 1:", e);
    }
  };

  const handleStartStage2 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(2);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 2,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 2:", e);
    }
  };

  const handleStartStage3 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(3);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 3,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 3:", e);
    }
  };

  const handleStartStage4 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(4);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 4,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 4:", e);
    }
  };

  const handleStartStage5 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(5);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 5,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 5:", e);
    }
  };

  const handleStartStage6 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(6);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 6,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 6:", e);
    }
  };

  const handleStartStage7 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(7);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 7,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 7:", e);
    }
  };

  const handleStartStage8 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await clearStageResponses(8);
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 8,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 8:", e);
    }
  };

  const handleStartStage9 = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await setDoc(doc(db, 'config', 'theater'), {
        currentStage: 9,
        timerStartedAt: null,
        showQuestion: true
      }, { merge: true });
    } catch (e) {
      console.error("Error starting stage 9:", e);
    }
  };

  const handleRevealQuestion = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await setDoc(doc(db, 'config', 'theater'), {
        showQuestion: true
      }, { merge: true });
    } catch (e) {
      console.error("Error revealing question:", e);
    }
  };

  const handleStartTimer = async () => {
    if (userId !== "박재형_940721") return;
    try {
      if (theaterConfig?.currentStage) {
        await clearStageResponses(theaterConfig.currentStage);
      }
      await setDoc(doc(db, 'config', 'theater'), {
        timerStartedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Error starting timer:", e);
    }
  };

  const handleEndTheater = async () => {
    if (userId !== "박재형_940721") return;
    try {
      await setDoc(doc(db, 'config', 'theater'), {
        active: false,
        currentStage: 0,
        timerStartedAt: null,
        showQuestion: false
      }, { merge: true });
    } catch (e) {
      console.error("Error ending theater:", e);
    }
  };

  const handleSubmitMemoryAnswer = (qNum: number, answerText: string) => {
    if (!userId) return;

    // 1. Optimistically update local state immediately (0ms delay)
    setLocalMemoryAnswers(prev => ({
      ...prev,
      [`q${qNum}`]: answerText
    }));
    setMemoryInputText('');
    setIsEditingMemory(false);

    try {
      const docRef = doc(db, 'memory_responses', userId);
      setDoc(docRef, {
        userId,
        userName: name,
        [`q${qNum}`]: answerText,
        updatedAt: serverTimestamp()
      }, { merge: true }).catch(e => {
        console.error("Error saving memory response in background:", e);
      });

      // Q6 답변을 제출할 때 익명 기도제목 게시판(prayers)에도 자동으로 등록
      if (Number(qNum) === 6 && answerText.trim() !== "") {
        addDoc(collection(db, 'prayers'), {
          content: `"${answerText.trim()}"`,
          likes: 0,
          createdAt: serverTimestamp(),
          authorId: "anonymous", // 익명 처리
          authorName: "익명"
        }).catch(prayerError => {
          console.error("Error auto-uploading Q6 prayer:", prayerError);
        });
      }
    } catch (e) {
      console.error("Error preparing memory response write:", e);
    }
  };

  const handleToggleMemory = async () => {
    if (userId !== "박재형_940721") return;
    try {
      const activeState = !memoryConfig?.active;
      if (activeState) {
        await setDoc(doc(db, 'config', 'theater'), { active: false }, { merge: true });
      }

      await setDoc(doc(db, 'config', 'memory'), {
        active: activeState,
        currentStage: 0,
        matches: []
      }, { merge: true });

      // Clear previous responses in background
      getDocs(collection(db, 'memory_responses')).then((snapshot) => {
        const batchPromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        Promise.all(batchPromises);
      }).catch(err => {
        console.error("Error clearing memory responses in background:", err);
      });
    } catch (e) {
      console.error("Error toggling memory:", e);
      alert("게임 활성화 상태를 변경하는 중 오류가 발생했습니다.");
    }
  };

  const handleCreateMemoryMatches = async () => {
    if (userId !== "박재형_940721" || !memoryConfig) return;
    try {
      const matches = createRandomMatchesList(participants);
      if (matches.length === 0) {
        alert("매칭할 참가자가 부족합니다 (최소 2명 필요).");
        return;
      }

      await setDoc(doc(db, 'config', 'memory'), {
        matches: matches
      }, { merge: true });
    } catch (e) {
      console.error("Error creating memory matches:", e);
      alert("매칭 중 오류가 발생했습니다.");
    }
  };

  const handleNextMemoryStage = async () => {
    if (userId !== "박재형_940721" || !memoryConfig) return;
    const nextStage = (memoryConfig.currentStage || 0) + 1;

    if (nextStage > 19) {
      await handleToggleMemory();
      return;
    }

    const isNextMatchingBridge = nextStage >= 7 && nextStage <= 17 && nextStage % 2 === 1;

    try {
      if (isNextMatchingBridge) {
        await setDoc(doc(db, 'config', 'memory'), {
          currentStage: nextStage,
          matches: []
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'config', 'memory'), {
          currentStage: nextStage
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error moving to next memory stage:", e);
      alert("다음 단계로 이동하는 중 오류가 발생했습니다.");
    }
  };

  const handlePrevMemoryStage = async () => {
    if (userId !== "박재형_940721" || !memoryConfig) return;
    const prevStage = Math.max((memoryConfig.currentStage || 0) - 1, 0);

    const isPrevMatchingBridge = prevStage >= 7 && prevStage <= 17 && prevStage % 2 === 1;

    try {
      if (isPrevMatchingBridge) {
        await setDoc(doc(db, 'config', 'memory'), {
          currentStage: prevStage,
          matches: []
        }, { merge: true });
      } else {
        await setDoc(doc(db, 'config', 'memory'), {
          currentStage: prevStage
        }, { merge: true });
      }
    } catch (e) {
      console.error("Error moving to prev memory stage:", e);
      alert("이전 단계로 이동하는 중 오류가 발생했습니다.");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    const trimmedBirth = birthdate.trim()

    let isValidUser = ALLOWED_USERS.some(
      user => user.name === trimmedName && user.birthdate === trimmedBirth
    );

    if (!isValidUser) {
      // 1. 로컬에 실시간 동기화 중인 participants 목록에서 먼저 초고속 확인 (0ms)
      const foundLocal = participants.some(
        p => p.name === trimmedName && p.birthdate === trimmedBirth
      );
      if (foundLocal) {
        isValidUser = true;
      } else {
        // 2. 혹시 방금 추가된 유저의 실시간 상태 전송 지연이 있을 경우를 위해 직접 Firestore 네트워크 조회 (Fallback)
        try {
          const participantDoc = await getDoc(doc(db, 'participants', `${trimmedName}_${trimmedBirth}`));
          if (participantDoc.exists()) {
            isValidUser = true;
          }
        } catch (err) {
          console.error("Error checking participant in Firestore:", err);
        }
      }
    }

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
          } else {
            setProfileImage(null);
          }
        } else {
          // 첫 로그인 시 유저 문서 생성
          await setDoc(doc(db, 'users', generatedId), {
            name: trimmedName,
            birthdate: trimmedBirth,
            createdAt: serverTimestamp()
          });
          setProfileImage(null);
        }
        setCurrentPage('home')
      } catch (error) {
        console.error("Login Error:", error);
        alert('로그인 처리 중 오류가 발생했습니다.');
      }
    } else {
      alert('정보가 일치하지 않습니다. 관리자에게 등록을 요청해주세요.')
    }
  }

  const handleLogout = () => {
    setCurrentPage('login')
    setShowProfile(false)
    setName('')
    setBirthdate('')
    setUserId(null)
    setProfileImage(null)
    setLocalMemoryAnswers({})
    setIsEditingMemory(false)
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

  const handleAIGroupingWrapper = async (keywords: string[], members: number, groups: number, participantsList: any[]) => {
    return await handleAIGrouping(keywords, members, groups, geminiApiKey, participantsList);
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
          onToggleTheater={handleToggleTheater}
          theaterActive={theaterConfig?.active}
          onToggleMemory={handleToggleMemory}
          memoryActive={memoryConfig?.active}
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
          groupData={groupData}
          participants={participants}
          usersMap={usersMap}
          geminiApiKey={geminiApiKey}
          setGeminiApiKey={handleSaveApiKey}
        />
        <MyGroupModal
          show={showMyGroup}
          onClose={() => setShowMyGroup(false)}
          groupData={groupData}
          userId={userId}
          name={name}
          usersMap={usersMap}
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
          </div>
        )}
      </>
    )
  }

  if (currentPage === 'theater') {
    // Stage 1 options
    const stage1Options = [
      { id: 1, text: "1. 이기창" },
      { id: 2, text: "2. 이경헌" },
      { id: 3, text: "3. 박시훈" }
    ];

    const handleVoteStage1 = async (optionId: number) => {
      if (!userId || !theaterConfig?.sessionId) return;
      try {
        const docId = `${userId}_1_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 1,
          sessionId: theaterConfig.sessionId,
          vote: optionId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Voting Error:", error);
      }
    };

    const handleVoteStage2 = async (candidateName: string) => {
      if (!userId || !theaterConfig?.sessionId) return;
      try {
        const docId = `${userId}_2_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 2,
          sessionId: theaterConfig.sessionId,
          vote: candidateName,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Voting Error:", error);
      }
    };

    // My Votes
    const myVote1Doc = theaterResponses.find(r => r.userId === userId && r.stage === 1);
    const myVote1Option = myVote1Doc ? myVote1Doc.vote : null;

    const myVote2Doc = theaterResponses.find(r => r.userId === userId && r.stage === 2);
    const myVote2Option = myVote2Doc ? myVote2Doc.vote : null;

    // Timer info
    const isTimerRunning = timeLeft !== null;
    const isTimerExpired = timeLeft === 0;
    const isVotingActive = isTimerRunning && !isTimerExpired;

    // Stats for Stage 1
    const stage1Responses = theaterResponses.filter(r => r.stage === 1);
    const totalVotes1 = stage1Responses.length;
    const getOptionStats1 = (optionId: number) => {
      const votes = stage1Responses.filter(r => r.vote === optionId).length;
      const pct = totalVotes1 > 0 ? Math.round((votes / totalVotes1) * 100) : 0;
      return { votes, pct };
    };

    // Stats for Stage 2
    const stage2Responses = theaterResponses.filter(r => r.stage === 2);
    const totalVotes2 = stage2Responses.length;

    const candidateVotes: { [name: string]: number } = {};
    stage2Responses.forEach(r => {
      if (r.vote) {
        candidateVotes[r.vote] = (candidateVotes[r.vote] || 0) + 1;
      }
    });

    const sortedCandidates = Object.entries(candidateVotes)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const displayCandidates = sortedCandidates.slice(0, 4);

    const maxCount = Math.max(...displayCandidates.map(c => c.count), 1);

    // Search and filter participants for Stage 2 (User View)
    const filteredParticipants = participants.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stage 3 options
    const stage3Options = [
      { id: 1, text: "0개" },
      { id: 2, text: "3개" },
      { id: 3, text: "5개" }
    ];

    const handleVoteStage3 = async (optionId: number) => {
      if (!userId || !theaterConfig?.sessionId) return;
      try {
        const docId = `${userId}_3_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 3,
          sessionId: theaterConfig.sessionId,
          vote: optionId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Voting Error:", error);
      }
    };

    const myVote3Doc = theaterResponses.find(r => r.userId === userId && r.stage === 3);
    const myVote3Option = myVote3Doc ? myVote3Doc.vote : null;

    const stage3Responses = theaterResponses.filter(r => r.stage === 3);
    const totalVotes3 = stage3Responses.length;
    const getOptionStats3 = (optionId: number) => {
      const votes = stage3Responses.filter(r => r.vote === optionId).length;
      const pct = totalVotes3 > 0 ? Math.round((votes / totalVotes3) * 100) : 0;
      return { votes, pct };
    };

    // Winner of Stage 1 (Barnabas)
    const votesCount: { [id: number]: number } = { 1: 0, 2: 0, 3: 0 };
    stage1Responses.forEach(r => {
      if (r.vote) {
        votesCount[r.vote] = (votesCount[r.vote] || 0) + 1;
      }
    });
    // Find option with max votes
    let winnerId = 1;
    let maxVotes = -1;
    Object.entries(votesCount).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = Number(id);
      }
    });
    const winnerName = winnerId === 1 ? '이기창' : winnerId === 2 ? '이경헌' : '박시훈';
    const winnerChars = winnerName.split('');

    const handleSubmitAcrostic = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!userId || !theaterConfig?.sessionId) return;
      if (acrosticInputs.some(input => !input.trim())) {
        alert("삼행시를 모두 채워주세요!");
        return;
      }
      try {
        const docId = `${userId}_4_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 4,
          sessionId: theaterConfig.sessionId,
          vote: acrosticInputs,
          createdAt: serverTimestamp()
        });
        setAcrosticInputs(['', '', '']);
      } catch (error) {
        console.error("Acrostic Submit Error:", error);
      }
    };

    const myVote4Doc = theaterResponses.find(r => r.userId === userId && r.stage === 4);

    const stage4Responses = theaterResponses
      .filter(r => r.stage === 4)
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt || 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt || 0);
        return timeA - timeB;
      });

    // Stage 5 options
    const stage5Options = [
      { id: 1, text: "사이다" },
      { id: 2, text: "소금사이다" }
    ];

    const handleVoteStage5 = async (optionId: number) => {
      if (!userId || !theaterConfig?.sessionId) return;
      try {
        const docId = `${userId}_5_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 5,
          sessionId: theaterConfig.sessionId,
          vote: optionId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Voting Error:", error);
      }
    };

    const myVote5Doc = theaterResponses.find(r => r.userId === userId && r.stage === 5);
    const myVote5Option = myVote5Doc ? myVote5Doc.vote : null;

    const stage5Responses = theaterResponses.filter(r => r.stage === 5);
    const totalVotes5 = stage5Responses.length;
    const getOptionStats5 = (optionId: number) => {
      const votes = stage5Responses.filter(r => r.vote === optionId).length;
      const pct = totalVotes5 > 0 ? Math.round((votes / totalVotes5) * 100) : 0;
      return { votes, pct };
    };

    // Stage 6 options
    const stage6Options = [
      { id: 1, text: "1" },
      { id: 2, text: "2" },
      { id: 3, text: "3" }
    ];

    const handleVoteStage6 = async (optionId: number) => {
      if (!userId || !theaterConfig?.sessionId) return;
      try {
        const docId = `${userId}_6_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 6,
          sessionId: theaterConfig.sessionId,
          vote: optionId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Voting Error:", error);
      }
    };

    const myVote6Doc = theaterResponses.find(r => r.userId === userId && r.stage === 6);
    const myVote6Option = myVote6Doc ? myVote6Doc.vote : null;

    const stage6Responses = theaterResponses.filter(r => r.stage === 6);
    const totalVotes6 = stage6Responses.length;
    const getOptionStats6 = (optionId: number) => {
      const votes = stage6Responses.filter(r => r.vote === optionId).length;
      const pct = totalVotes6 > 0 ? Math.round((votes / totalVotes6) * 100) : 0;
      return { votes, pct };
    };

    // Stage 7 options
    const stage7Options = [
      { id: 1, text: "우유" },
      { id: 2, text: "우유 + 불닭소스" }
    ];

    const handleVoteStage7 = async (optionId: number) => {
      if (!userId || !theaterConfig?.sessionId) return;
      try {
        const docId = `${userId}_7_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 7,
          sessionId: theaterConfig.sessionId,
          vote: optionId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Voting Error:", error);
      }
    };

    const myVote7Doc = theaterResponses.find(r => r.userId === userId && r.stage === 7);
    const myVote7Option = myVote7Doc ? myVote7Doc.vote : null;

    const stage7Responses = theaterResponses.filter(r => r.stage === 7);
    const totalVotes7 = stage7Responses.length;
    const getOptionStats7 = (optionId: number) => {
      const votes = stage7Responses.filter(r => r.vote === optionId).length;
      const pct = totalVotes7 > 0 ? Math.round((votes / totalVotes7) * 100) : 0;
      return { votes, pct };
    };

    // Stage 8 options
    const stage8Options = [
      { id: 1, text: "1" },
      { id: 2, text: "2" },
      { id: 3, text: "3" }
    ];

    const handleVoteStage8 = async (optionId: number) => {
      if (!userId || !theaterConfig?.sessionId) return;
      try {
        const docId = `${userId}_8_${theaterConfig.sessionId}`;
        await setDoc(doc(db, 'theater_responses', docId), {
          userId,
          userName: name,
          stage: 8,
          sessionId: theaterConfig.sessionId,
          vote: optionId,
          createdAt: serverTimestamp()
        });
      } catch (error) {
        console.error("Voting Error:", error);
      }
    };

    const myVote8Doc = theaterResponses.find(r => r.userId === userId && r.stage === 8);
    const myVote8Option = myVote8Doc ? myVote8Doc.vote : null;

    const stage8Responses = theaterResponses.filter(r => r.stage === 8);
    const totalVotes8 = stage8Responses.length;
    const getOptionStats8 = (optionId: number) => {
      const votes = stage8Responses.filter(r => r.vote === optionId).length;
      const pct = totalVotes8 > 0 ? Math.round((votes / totalVotes8) * 100) : 0;
      return { votes, pct };
    };

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
          onToggleTheater={handleToggleTheater}
          theaterActive={theaterConfig?.active}
          onToggleMemory={handleToggleMemory}
          memoryActive={memoryConfig?.active}
        />
        <div className="top-nav">
          {userId === "박재형_940721" && (
            <ChevronLeft className="nav-back" size={28} onClick={handleEndTheater} />
          )}
        </div>

        <div className="ppt-theater-container">
          <div className="ppt-card">
            {theaterConfig?.currentStage === 0 ? (
              // STAGE 0: Intro / Waiting
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center' }}>
                <div className="pulsate-glow" style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#755e22', borderRadius: '50%' }}>
                  <Film size={40} color="white" />
                </div>
                <h2 className="ppt-title">리얼선택 극장에 오신 것을 환영합니다!</h2>
                <p className="ppt-subtitle">
                  {userId === "박재형_940721"
                    ? "관객들이 모두 입장하여 연극 시작을 기다리고 있습니다.\n아래 시작 버튼을 누르면 첫 번째 질문이 시작됩니다."
                    : "곧 실시간 극단 연극이 진행됩니다.\n주인공의 선택을 실시간으로 함께 결정해 보세요!"}
                </p>

                {userId === "박재형_940721" && (
                  <button
                    onClick={handleStartStage1}
                    className="ppt-btn-solid"
                    style={{ width: '100%', maxWidth: '400px', height: '60px', fontSize: '18px', margin: '20px 0 0' }}
                  >
                    <Play size={20} /> 시작하기
                  </button>
                )}
              </div>
            ) : !theaterConfig?.showQuestion ? (
              // BRIDGE PAGE: "리얼선택 극장" shown in large font
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div
                  className="pulsate-glow"
                  style={{
                    width: userId === "박재형_940721" ? '160px' : '100px',
                    height: userId === "박재형_940721" ? '160px' : '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#755e22',
                    borderRadius: '50%',
                    boxShadow: '0 10px 30px rgba(117, 94, 34, 0.15)',
                    marginBottom: '10px'
                  }}
                >
                  <Film size={userId === "박재형_940721" ? 70 : 40} color="white" />
                </div>

                <div style={{
                  position: 'relative',
                  padding: userId === "박재형_940721" ? '30px 100px' : '20px 60px',
                  borderTop: userId === "박재형_940721" ? '5px double #b4925a' : '3px double #b4925a',
                  borderBottom: userId === "박재형_940721" ? '5px double #b4925a' : '3px double #b4925a',
                  display: 'inline-block',
                  margin: '10px 0'
                }}>
                  <h1 className="ppt-title" style={{
                    fontSize: userId === "박재형_940721" ? '130px' : '96px',
                    fontWeight: '950',
                    letterSpacing: '-2px',
                    color: '#2b2315',
                    margin: 0,
                    lineHeight: 1.1,
                    textShadow: '2px 2px 0px rgba(180, 146, 90, 0.15)'
                  }}>
                    리얼선택 극장
                  </h1>
                </div>

                {userId === "박재형_940721" ? (
                  <button
                    onClick={handleRevealQuestion}
                    className="ppt-btn-solid"
                    style={{ width: '100%', maxWidth: '350px', height: '60px', fontSize: '18px', marginTop: '30px' }}
                  >
                    <Play size={20} /> 다음
                  </button>
                ) : (
                  <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div className="spinner-small" style={{ borderTopColor: '#755e22', width: '28px', height: '28px', border: '3px solid rgba(117, 94, 34, 0.15)' }} />
                    <span style={{ fontSize: '15px', color: '#a2864c', fontWeight: '700', letterSpacing: '-0.2px' }}>곧 질문이 시작됩니다. 앞의 스크린을 주목해 주세요!</span>
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 1 ? (
              // STAGE 1: "1. 주인공 바나바는 누구?"
              <div>
                <span className="ppt-phase-label">PHASE 1: IDENTIFICATION</span>
                <h2 className="ppt-title">1. 주인공 바나바는 누구?</h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: Large cards with solid fill, same style as Stage 6/7/8
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      width: '100%', 
                      maxWidth: '850px', 
                      margin: '30px auto',
                      filter: (userId === "박재형_940721" && timeLeft !== null && timeLeft <= 5 && !showResults) ? 'blur(15px)' : 'none',
                      transition: 'filter 0.5s'
                    }}>
                      {stage1Options.map((opt) => {
                        const stats = getOptionStats1(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                              border: '1px solid rgba(117, 94, 34, 0.1)',
                              flex: 1,
                              overflow: 'hidden'
                            }}
                          >
                            {/* Fill Background */}
                            <div
                              className="ppt-card-progress-fill"
                              style={{ 
                                height: `${stats.pct}%`,
                                position: 'absolute',
                                bottom: 0, left: 0, width: '100%',
                                zIndex: 1,
                                transition: 'height 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)'
                              }}
                            />
                            {/* Card Content */}
                            <div style={{ position: 'relative', zIndex: 2, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                              <div style={{ fontSize: '38px', fontWeight: '900', color: stats.pct > 50 ? '#ffffff' : '#755e22', marginBottom: '10px', transition: 'color 0.5s' }}>
                                {opt.text}
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: stats.pct > 50 ? '#ffffff' : '#2b2315', marginBottom: '20px', transition: 'color 0.5s' }}>
                                {stats.votes}명 선택
                              </div>
                              <div style={{ fontSize: '24px', color: stats.pct > 50 ? '#f0e9d9' : '#a2864c', fontWeight: '800', transition: 'color 0.5s' }}>
                                {stats.pct}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="ppt-total-badge">
                      참여 관객: {totalVotes1}명 / 실시간 투표 집계 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '30px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 30초 투표 시작
                          </button>
                        )}
                        {timeLeft === 0 && !showResults && (
                          <button onClick={() => setShowResults(true)} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#e63946' }}>
                            결과 발표하기
                          </button>
                        )}
                        <button onClick={handleStartStage2} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#b4925a' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Binary / card options style matching Stage 6/7/8
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {!isTimerRunning ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#755e22', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표 시작을 기다리고 있습니다. 스크린을 주목해 주세요!
                      </div>
                    ) : isTimerExpired ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#8a8373', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표가 마감되었습니다.
                      </div>
                    ) : null}

                    <div className="ppt-options-grid">
                      {stage1Options.map((opt) => {
                        const isSelected = myVote1Option === opt.id;
                        const canVote = isVotingActive;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => canVote && handleVoteStage1(opt.id)}
                            disabled={!canVote}
                            className={`ppt-card-btn ${isSelected ? 'selected' : ''}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? '#755e22' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#2b2315',
                              border: isSelected ? '2px solid #755e22' : '1px solid rgba(117, 94, 34, 0.1)',
                              borderRadius: '24px',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              gap: '10px',
                              padding: '25px 15px',
                              minHeight: '130px'
                            }}
                          >
                            <span style={{ fontSize: '26px', fontWeight: '950', color: isSelected ? '#ffffff' : '#755e22' }}>
                              {opt.text}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', opacity: 0.9 }}>
                                선택됨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 2 ? (
              // STAGE 2: "2. 곤장을 때릴 사람은?"
              <div>
                <span className="ppt-phase-label">PHASE 2: CONSEQUENCE</span>
                <h2 className="ppt-title">2. 곤장을 때릴 사람은?</h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: Top 4 Voted Cards Side-by-Side (Mockup Layout)
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '16px', 
                      width: '100%', 
                      maxWidth: '850px', 
                      margin: '30px auto', 
                      justifyContent: 'center',
                      filter: (userId === "박재형_940721" && timeLeft !== null && timeLeft <= 5 && !showResults) ? 'blur(15px)' : 'none',
                      transition: 'filter 0.5s'
                    }}>
                      {displayCandidates.length === 0 ? (
                        <div style={{
                          background: '#ffffff',
                          borderRadius: '20px',
                          padding: '60px 40px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                          border: '1px solid rgba(117, 94, 34, 0.1)',
                          width: '100%',
                          maxWidth: '500px',
                          gap: '15px'
                        }}>
                          <div className="spinner-small" style={{ borderTopColor: '#755e22', width: '28px', height: '28px', border: '3px solid rgba(117, 94, 34, 0.15)' }} />
                          <span style={{ fontSize: '18px', fontWeight: '800', color: '#755e22' }}>투표 결과를 대기하고 있습니다...</span>
                        </div>
                      ) : (
                        displayCandidates.map((cand, idx) => {
                          const rankLabel = `${idx + 1}위`;
                          const pct = Math.round((cand.count / maxCount) * 100);
                          return (
                            <div
                              key={cand.name}
                              style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                padding: '24px 16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                position: 'relative',
                                boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                                border: idx === 0 ? '1.5px solid #b4925a' : '1px solid rgba(117, 94, 34, 0.1)',
                                overflow: 'hidden',
                                flex: 1
                              }}
                            >
                              {/* Rank Badge */}
                              <div
                                style={{
                                  background: idx === 0 ? '#755e22' : idx === 1 ? '#8a8373' : idx === 2 ? '#a8a090' : '#c4bcac',
                                  color: '#ffffff',
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  padding: '3px 12px',
                                  borderRadius: '20px',
                                  position: 'absolute',
                                  top: '12px'
                                }}
                              >
                                {rankLabel}
                              </div>

                              {/* Avatar Icon */}
                              <div
                                style={{
                                  width: '70px',
                                  height: '70px',
                                  borderRadius: '50%',
                                  background: '#f5f0e6',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginTop: '24px',
                                  marginBottom: '16px'
                                }}
                              >
                                <CircleUser size={40} color="#a2864c" strokeWidth={1} />
                              </div>

                              {/* Name */}
                              <div style={{ fontSize: '18px', fontWeight: '800', color: '#2b2315', marginBottom: '4px' }}>
                                {cand.name}
                              </div>

                              {/* Votes */}
                              <div style={{ fontSize: '14px', fontWeight: '700', color: '#755e22' }}>
                                {cand.count}표
                              </div>

                              {/* Bottom Progress Line */}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: 0,
                                  left: 0,
                                  height: '5px',
                                  width: `${pct}%`,
                                  background: idx === 0 ? '#755e22' : '#b4925a',
                                  transition: 'width 0.5s ease-out'
                                }}
                              />
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="ppt-total-badge">
                      참여 관객: {totalVotes2}명 / 실시간 투표 진행 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '30px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 30초 투표 시작
                          </button>
                        )}
                        {timeLeft === 0 && !showResults && (
                          <button onClick={() => setShowResults(true)} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#e63946' }}>
                            결과 발표하기
                          </button>
                        )}
                        <button onClick={handleStartStage3} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#755e22' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Searchable List Grid of all participants
                  <div>
                    <p className="ppt-subtitle" style={{ fontSize: '16px', marginBottom: '20px' }}>
                      아래 참가자 명단에서 곤장을 때릴 한 명을 선택해 주세요.
                    </p>

                    {/* Search Input */}
                    <div style={{ position: 'relative', width: '100%', maxWidth: '450px', margin: '0 auto 24px' }}>
                      <input
                        type="text"
                        placeholder="이름 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 20px 12px 48px',
                          borderRadius: '30px',
                          border: '1.5px solid rgba(117, 94, 34, 0.2)',
                          fontSize: '15px',
                          outline: 'none',
                          background: '#ffffff',
                          color: '#2b2315',
                          boxShadow: '0 4px 12px rgba(117, 94, 34, 0.03)'
                        }}
                      />
                      <Search size={18} color="#a2864c" style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)' }} />
                    </div>

                    {/* Scrollable list of participants */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: '12px',
                        width: '100%',
                        maxWidth: '750px',
                        margin: '0 auto',
                        maxHeight: '380px',
                        overflowY: 'auto',
                        padding: '10px',
                        background: 'rgba(255, 255, 255, 0.5)',
                        borderRadius: '24px',
                        border: '1px solid rgba(117, 94, 34, 0.08)'
                      }}
                    >
                      {filteredParticipants.map((p) => {
                        const isSelected = myVote2Option === p.name;
                        const canVote = isVotingActive;
                        return (
                          <button
                            key={`${p.name}_${p.birthdate}`}
                            onClick={() => canVote && handleVoteStage2(p.name)}
                            disabled={!canVote}
                            style={{
                              background: isSelected ? '#755e22' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#2b2315',
                              border: isSelected ? '1.5px solid #755e22' : '1px solid rgba(117, 94, 34, 0.1)',
                              borderRadius: '16px',
                              padding: '14px 10px',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '14px',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.02)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {p.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 3 ? (
              // STAGE 3: "3. 절도죄에 알맞은 형량은?"
              <div>
                <span className="ppt-phase-label">PHASE 3: PENALTY</span>
                <h2 className="ppt-title">3. 절도죄에 알맞은 형량은?</h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: Horizontal progress bars with large option texts, no icons
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      width: '100%', 
                      maxWidth: '850px', 
                      margin: '30px auto',
                      filter: (userId === "박재형_940721" && timeLeft !== null && timeLeft <= 5 && !showResults) ? 'blur(15px)' : 'none',
                      transition: 'filter 0.5s'
                    }}>
                      {stage3Options.map((opt) => {
                        const stats = getOptionStats3(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                              border: '1px solid rgba(117, 94, 34, 0.1)',
                              flex: 1,
                              overflow: 'hidden'
                            }}
                          >
                            {/* Fill Background */}
                            <div
                              className="ppt-card-progress-fill"
                              style={{ 
                                height: `${stats.pct}%`,
                                position: 'absolute',
                                bottom: 0, left: 0, width: '100%',
                                zIndex: 1,
                                transition: 'height 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)'
                              }}
                            />
                            {/* Card Content */}
                            <div style={{ position: 'relative', zIndex: 2, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                              {/* Large Text */}
                              <div style={{ fontSize: '54px', fontWeight: '900', color: stats.pct > 50 ? '#ffffff' : '#755e22', marginBottom: '10px', transition: 'color 0.5s' }}>
                                {opt.text}
                              </div>
                              {/* Votes Count */}
                              <div style={{ fontSize: '18px', fontWeight: '700', color: stats.pct > 50 ? '#ffffff' : '#2b2315', marginBottom: '20px', transition: 'color 0.5s' }}>
                                {stats.votes}명 선택
                              </div>
                              <div style={{ fontSize: '24px', color: stats.pct > 50 ? '#f0e9d9' : '#a2864c', fontWeight: '800', transition: 'color 0.5s' }}>
                                {stats.pct}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="ppt-total-badge">
                      참여 관객: {totalVotes3}명 / 실시간 투표 진행 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '30px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 30초 투표 시작
                          </button>
                        )}
                        {timeLeft === 0 && !showResults && (
                          <button onClick={() => setShowResults(true)} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#e63946' }}>
                            결과 발표하기
                          </button>
                        )}
                        <button onClick={handleStartStage4} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#755e22' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Side-by-side vertical cards with large text
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    <p className="ppt-subtitle" style={{ fontSize: '16px', marginBottom: '30px' }}>
                      절도죄에 알맞은 형량을 선택해 주세요.
                    </p>

                    <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                      {stage3Options.map((opt) => {
                        const isSelected = myVote3Option === opt.id;
                        const canVote = isVotingActive;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => canVote && handleVoteStage3(opt.id)}
                            disabled={!canVote}
                            className={`ppt-card-btn ${isSelected ? 'selected' : ''}`}
                            style={{
                              flex: 1,
                              height: '180px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? '#755e22' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#2b2315',
                              border: isSelected ? '2px solid #755e22' : '1px solid rgba(117, 94, 34, 0.1)',
                              borderRadius: '24px',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              gap: '10px'
                            }}
                          >
                            <span style={{ fontSize: '38px', fontWeight: '900', color: isSelected ? '#ffffff' : '#755e22' }}>
                              {opt.text}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', opacity: 0.9 }}>
                                선택됨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 4 ? (
              // STAGE 4: 삼행시 백일장
              <div>
                <span className="ppt-phase-label">PHASE 4: ACROSTIC POEM</span>
                <h2 className="ppt-title" style={{ fontSize: '38px', fontWeight: '800', color: '#2b2315', marginBottom: '10px' }}>
                  바나바({winnerName}) 삼행시 짓기
                </h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: List of acrostics, clicking one opens a popup modal
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', width: '100%', maxWidth: '850px', margin: '20px auto', maxHeight: '420px', overflowY: 'auto', padding: '10px' }}>
                      {stage4Responses.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', padding: '60px 40px', textAlign: 'center' }}>
                          <div className="spinner-small" style={{ borderTopColor: '#755e22', width: '28px', height: '28px', border: '3px solid rgba(117, 94, 34, 0.15)', margin: '0 auto 15px' }} />
                          <span style={{ fontSize: '18px', fontWeight: '800', color: '#755e22' }}>관객들의 삼행시 제출을 기다리고 있습니다...</span>
                        </div>
                      ) : (
                        stage4Responses.map((res, idx) => (
                          <button
                            key={res.userId}
                            onClick={() => setSelectedAcrostic(res)}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              padding: '20px',
                              border: '1.5px solid rgba(117, 94, 34, 0.1)',
                              boxShadow: '0 8px 20px rgba(117, 94, 34, 0.04)',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.2s ease',
                              position: 'relative',
                              overflow: 'hidden',
                              display: 'block',
                              width: '100%'
                            }}
                            className="premium-btn"
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                              <span style={{ fontSize: '15px', fontWeight: '800', color: '#755e22' }}>{res.userName}</span>
                              <span style={{ fontSize: '12px', fontWeight: '700', color: '#a2864c' }}>#{idx + 1}</span>
                            </div>
                            <div style={{ fontSize: '14px', color: '#615545', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {res.vote && Array.isArray(res.vote) && res.vote.map((line: any, lIdx: number) => (
                                <div key={lIdx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <b>{winnerChars[lIdx]}:</b> {line}
                                </div>
                              ))}
                            </div>
                          </button>
                        ))
                      )}
                    </div>

                    <div className="ppt-total-badge">
                      제출된 삼행시: {stage4Responses.length}개 / 실시간 업데이트 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '30px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '20px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 180초 투표 시작
                          </button>
                        )}
                        <button onClick={handleStartStage5} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#755e22' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Acrostic Submission Form
                  <div>
                    {myVote4Doc ? (
                      // Already Submitted
                      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '30px', maxWidth: '500px', margin: '20px auto', border: '1px solid rgba(117, 94, 34, 0.1)', boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)' }}>
                        <p style={{ fontSize: '16px', color: '#755e22', fontWeight: 'bold', marginBottom: '20px' }}>제출하신 삼행시입니다</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                          {myVote4Doc.vote && Array.isArray(myVote4Doc.vote) && myVote4Doc.vote.map((line: any, idx: number) => (
                            <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                              <span style={{ fontSize: '24px', fontWeight: '900', color: '#755e22', width: '30px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '28px', lineHeight: '28px' }}>{winnerChars[idx]}</span>
                              <span style={{ fontSize: '18px', color: '#2b2315', fontWeight: '600' }}>{line}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Submit Form
                      <form onSubmit={handleSubmitAcrostic} style={{ width: '100%', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {!isTimerRunning ? (
                          <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#755e22', fontWeight: '700', fontSize: '14px' }}>
                            투표 시작을 기다리고 있습니다. 스크린을 주목해 주세요!
                          </div>
                        ) : isTimerExpired ? (
                          <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#8a8373', fontWeight: '700', fontSize: '14px' }}>
                            투표가 마감되었습니다.
                          </div>
                        ) : null}

                        {winnerChars.map((char, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#ffffff', padding: '10px 20px', borderRadius: '20px', border: '1.5px solid rgba(117, 94, 34, 0.15)', boxShadow: '0 4px 12px rgba(117, 94, 34, 0.03)' }}>
                            <span style={{ fontSize: '28px', fontWeight: '950', color: '#755e22', width: '30px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '36px', lineHeight: '36px' }}>{char}</span>
                            <input
                              type="text"
                              placeholder={isVotingActive ? `${char}으로 시작하는 문장...` : ""}
                              value={acrosticInputs[idx] || ''}
                              onChange={(e) => {
                                const newInputs = [...acrosticInputs];
                                newInputs[idx] = e.target.value;
                                setAcrosticInputs(newInputs);
                              }}
                              style={{
                                flex: 1,
                                border: 'none',
                                outline: 'none',
                                fontSize: '18px',
                                color: '#2b2315',
                                background: 'transparent',
                                fontWeight: '600',
                                height: '36px',
                                lineHeight: '36px',
                                padding: 0,
                                margin: 0
                              }}
                              maxLength={30}
                              disabled={!isVotingActive}
                            />
                          </div>
                        ))}
                        <button
                          type="submit"
                          className="ppt-btn-solid"
                          style={{ height: '55px', fontSize: '16px', marginTop: '10px' }}
                          disabled={!isVotingActive}
                        >
                          제출하기
                        </button>
                      </form>
                    )}
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 5 ? (
              // STAGE 5: 무엇을 마실까요?
              <div>
                <span className="ppt-phase-label">PHASE 5: DRINK CHOICE</span>
                <h2 className="ppt-title">5. 무엇을 마실까요?</h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: Binary horizontal progress bars
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      width: '100%', 
                      maxWidth: '850px', 
                      margin: '30px auto',
                      filter: (userId === "박재형_940721" && timeLeft !== null && timeLeft <= 5 && !showResults) ? 'blur(15px)' : 'none',
                      transition: 'filter 0.5s'
                    }}>
                      {stage5Options.map((opt) => {
                        const stats = getOptionStats5(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                              border: '1px solid rgba(117, 94, 34, 0.1)',
                              flex: 1,
                              overflow: 'hidden'
                            }}
                          >
                            {/* Fill Background */}
                            <div
                              className="ppt-card-progress-fill"
                              style={{ 
                                height: `${stats.pct}%`,
                                position: 'absolute',
                                bottom: 0, left: 0, width: '100%',
                                zIndex: 1,
                                transition: 'height 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)'
                              }}
                            />
                            {/* Card Content */}
                            <div style={{ position: 'relative', zIndex: 2, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                              <div style={{ fontSize: '38px', fontWeight: '900', color: stats.pct > 50 ? '#ffffff' : '#755e22', marginBottom: '10px', transition: 'color 0.5s' }}>
                                {opt.text}
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: stats.pct > 50 ? '#ffffff' : '#2b2315', marginBottom: '20px', transition: 'color 0.5s' }}>
                                {stats.votes}명 선택
                              </div>
                              <div style={{ fontSize: '24px', color: stats.pct > 50 ? '#f0e9d9' : '#a2864c', fontWeight: '800', transition: 'color 0.5s' }}>
                                {stats.pct}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="ppt-total-badge">
                      참여 관객: {totalVotes5}명 / 실시간 투표 진행 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '30px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 15초 투표 시작
                          </button>
                        )}
                        {timeLeft === 0 && !showResults && (
                          <button onClick={() => setShowResults(true)} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#e63946' }}>
                            결과 발표하기
                          </button>
                        )}
                        <button onClick={handleStartStage6} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#755e22' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Binary options
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {!isTimerRunning ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#755e22', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표 시작을 기다리고 있습니다. 스크린을 주목해 주세요!
                      </div>
                    ) : isTimerExpired ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#8a8373', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표가 마감되었습니다.
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                      {stage5Options.map((opt) => {
                        const isSelected = myVote5Option === opt.id;
                        const canVote = isVotingActive;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => canVote && handleVoteStage5(opt.id)}
                            disabled={!canVote}
                            className={`ppt-card-btn ${isSelected ? 'selected' : ''}`}
                            style={{
                              flex: 1,
                              height: '180px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? '#755e22' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#2b2315',
                              border: isSelected ? '2px solid #755e22' : '1px solid rgba(117, 94, 34, 0.1)',
                              borderRadius: '24px',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              gap: '10px'
                            }}
                          >
                            <span style={{ fontSize: '30px', fontWeight: '900', color: isSelected ? '#ffffff' : '#755e22' }}>
                              {opt.text}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', opacity: 0.9 }}>
                                선택됨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 6 ? (
              // STAGE 6: 누가 마실까요?
              <div>
                <span className="ppt-phase-label">PHASE 6: CHARACTER CHOICE</span>
                <h2 className="ppt-title">6. 누가 마실까요?</h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: Binary horizontal progress bars
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      width: '100%', 
                      maxWidth: '850px', 
                      margin: '30px auto',
                      filter: (userId === "박재형_940721" && timeLeft !== null && timeLeft <= 5 && !showResults) ? 'blur(15px)' : 'none',
                      transition: 'filter 0.5s'
                    }}>
                      {stage6Options.map((opt) => {
                        const stats = getOptionStats6(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                              border: '1px solid rgba(117, 94, 34, 0.1)',
                              flex: 1,
                              overflow: 'hidden'
                            }}
                          >
                            {/* Fill Background */}
                            <div
                              className="ppt-card-progress-fill"
                              style={{ 
                                height: `${stats.pct}%`,
                                position: 'absolute',
                                bottom: 0, left: 0, width: '100%',
                                zIndex: 1,
                                transition: 'height 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)'
                              }}
                            />
                            {/* Card Content */}
                            <div style={{ position: 'relative', zIndex: 2, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                              <div style={{ fontSize: '38px', fontWeight: '900', color: stats.pct > 50 ? '#ffffff' : '#755e22', marginBottom: '10px', transition: 'color 0.5s' }}>
                                {opt.text}
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: stats.pct > 50 ? '#ffffff' : '#2b2315', marginBottom: '20px', transition: 'color 0.5s' }}>
                                {stats.votes}명 선택
                              </div>
                              <div style={{ fontSize: '24px', color: stats.pct > 50 ? '#f0e9d9' : '#a2864c', fontWeight: '800', transition: 'color 0.5s' }}>
                                {stats.pct}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="ppt-total-badge">
                      참여 관객: {totalVotes6}명 / 실시간 투표 진행 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '30px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 30초 투표 시작
                          </button>
                        )}
                        {timeLeft === 0 && !showResults && (
                          <button onClick={() => setShowResults(true)} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#e63946' }}>
                            결과 발표하기
                          </button>
                        )}
                        <button onClick={handleStartStage7} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#755e22' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Binary options
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {!isTimerRunning ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#755e22', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표 시작을 기다리고 있습니다. 스크린을 주목해 주세요!
                      </div>
                    ) : isTimerExpired ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#8a8373', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표가 마감되었습니다.
                      </div>
                    ) : null}

                    <div className="ppt-options-grid">
                      {stage6Options.map((opt) => {
                        const isSelected = myVote6Option === opt.id;
                        const canVote = isVotingActive;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => canVote && handleVoteStage6(opt.id)}
                            disabled={!canVote}
                            className={`ppt-card-btn ${isSelected ? 'selected' : ''}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? '#755e22' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#2b2315',
                              border: isSelected ? '2px solid #755e22' : '1px solid rgba(117, 94, 34, 0.1)',
                              borderRadius: '24px',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              gap: '10px',
                              padding: '25px 15px',
                              minHeight: '130px'
                            }}
                          >
                            <span style={{ fontSize: '26px', fontWeight: '950', color: isSelected ? '#ffffff' : '#755e22' }}>
                              {opt.text}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', opacity: 0.9 }}>
                                선택됨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 7 ? (
              // STAGE 7: 메인디시는 무엇일까요?
              <div>
                <span className="ppt-phase-label">PHASE 7: MAIN DISH CHOICE</span>
                <h2 className="ppt-title">7. 메인디시는 무엇일까요?</h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: Binary horizontal progress bars
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      width: '100%', 
                      maxWidth: '850px', 
                      margin: '30px auto',
                      filter: (userId === "박재형_940721" && timeLeft !== null && timeLeft <= 5 && !showResults) ? 'blur(15px)' : 'none',
                      transition: 'filter 0.5s'
                    }}>
                      {stage7Options.map((opt) => {
                        const stats = getOptionStats7(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                              border: '1px solid rgba(117, 94, 34, 0.1)',
                              flex: 1,
                              overflow: 'hidden'
                            }}
                          >
                            {/* Fill Background */}
                            <div
                              className="ppt-card-progress-fill"
                              style={{ 
                                height: `${stats.pct}%`,
                                position: 'absolute',
                                bottom: 0, left: 0, width: '100%',
                                zIndex: 1,
                                transition: 'height 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)'
                              }}
                            />
                            {/* Card Content */}
                            <div style={{ position: 'relative', zIndex: 2, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                              <div style={{ fontSize: '38px', fontWeight: '900', color: stats.pct > 50 ? '#ffffff' : '#755e22', marginBottom: '10px', transition: 'color 0.5s' }}>
                                {opt.text}
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: stats.pct > 50 ? '#ffffff' : '#2b2315', marginBottom: '20px', transition: 'color 0.5s' }}>
                                {stats.votes}명 선택
                              </div>
                              <div style={{ fontSize: '24px', color: stats.pct > 50 ? '#f0e9d9' : '#a2864c', fontWeight: '800', transition: 'color 0.5s' }}>
                                {stats.pct}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="ppt-total-badge">
                      참여 관객: {totalVotes7}명 / 실시간 투표 진행 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '30px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 30초 투표 시작
                          </button>
                        )}
                        {timeLeft === 0 && !showResults && (
                          <button onClick={() => setShowResults(true)} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#e63946' }}>
                            결과 발표하기
                          </button>
                        )}
                        <button onClick={handleStartStage8} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#755e22' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Binary options
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {!isTimerRunning ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#755e22', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표 시작을 기다리고 있습니다. 스크린을 주목해 주세요!
                      </div>
                    ) : isTimerExpired ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#8a8373', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표가 마감되었습니다.
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                      {stage7Options.map((opt) => {
                        const isSelected = myVote7Option === opt.id;
                        const canVote = isVotingActive;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => canVote && handleVoteStage7(opt.id)}
                            disabled={!canVote}
                            className={`ppt-card-btn ${isSelected ? 'selected' : ''}`}
                            style={{
                              flex: 1,
                              height: '180px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? '#755e22' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#2b2315',
                              border: isSelected ? '2px solid #755e22' : '1px solid rgba(117, 94, 34, 0.1)',
                              borderRadius: '24px',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              gap: '10px'
                            }}
                          >
                            <span style={{ fontSize: '30px', fontWeight: '900', color: isSelected ? '#ffffff' : '#755e22' }}>
                              {opt.text}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', opacity: 0.9 }}>
                                선택됨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : theaterConfig?.currentStage === 8 ? (
              // STAGE 8: 누가 먹을까요?
              <div>
                <span className="ppt-phase-label">PHASE 8: CHARACTER CHOICE</span>
                <h2 className="ppt-title">8. 누가 먹을까요?</h2>
                <div className="ppt-divider" />

                {/* Timer Circle */}
                {isTimerRunning && (
                  <div className="ppt-timer-circle">
                    <span className="ppt-timer-value">{timeLeft}</span>
                    <span className="ppt-timer-unit">초</span>
                  </div>
                )}

                {userId === "박재형_940721" ? (
                  // ADMIN VIEW: Binary horizontal progress bars
                  <div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '20px', 
                      width: '100%', 
                      maxWidth: '850px', 
                      margin: '30px auto',
                      filter: (userId === "박재형_940721" && timeLeft !== null && timeLeft <= 5 && !showResults) ? 'blur(15px)' : 'none',
                      transition: 'filter 0.5s'
                    }}>
                      {stage8Options.map((opt) => {
                        const stats = getOptionStats8(opt.id);
                        return (
                          <div
                            key={opt.id}
                            style={{
                              background: '#ffffff',
                              borderRadius: '20px',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              position: 'relative',
                              boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)',
                              border: '1px solid rgba(117, 94, 34, 0.1)',
                              flex: 1,
                              overflow: 'hidden'
                            }}
                          >
                            {/* Fill Background */}
                            <div
                              className="ppt-card-progress-fill"
                              style={{ 
                                height: `${stats.pct}%`,
                                position: 'absolute',
                                bottom: 0, left: 0, width: '100%',
                                zIndex: 1,
                                transition: 'height 0.8s cubic-bezier(0.1, 0.8, 0.2, 1)'
                              }}
                            />
                            {/* Card Content */}
                            <div style={{ position: 'relative', zIndex: 2, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                              <div style={{ fontSize: '38px', fontWeight: '900', color: stats.pct > 50 ? '#ffffff' : '#755e22', marginBottom: '10px', transition: 'color 0.5s' }}>
                                {opt.text}
                              </div>
                              <div style={{ fontSize: '18px', fontWeight: '700', color: stats.pct > 50 ? '#ffffff' : '#2b2315', marginBottom: '20px', transition: 'color 0.5s' }}>
                                {stats.votes}명 선택
                              </div>
                              <div style={{ fontSize: '24px', color: stats.pct > 50 ? '#f0e9d9' : '#a2864c', fontWeight: '800', transition: 'color 0.5s' }}>
                                {stats.pct}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="ppt-total-badge">
                      참여 관객: {totalVotes8}명 / 실시간 투표 진행 중
                    </div>

                    {/* Admin Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '40px', borderTop: '1px dashed rgba(117, 94, 34, 0.2)', paddingTop: '30px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '500px' }}>
                        {!isTimerRunning && (
                          <button onClick={handleStartTimer} className="ppt-btn-solid" style={{ flex: 1 }}>
                            <Timer size={16} /> 30초 투표 시작
                          </button>
                        )}
                        {timeLeft === 0 && !showResults && (
                          <button onClick={() => setShowResults(true)} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#e63946' }}>
                            결과 발표하기
                          </button>
                        )}
                        <button onClick={handleStartStage9} className="ppt-btn-solid" style={{ flex: 1, backgroundColor: '#755e22' }}>
                          다음으로 넘어가기
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // USER VIEW: Binary options
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {!isTimerRunning ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#755e22', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표 시작을 기다리고 있습니다. 스크린을 주목해 주세요!
                      </div>
                    ) : isTimerExpired ? (
                      <div style={{ padding: '15px', background: '#f5f0e6', borderRadius: '16px', color: '#8a8373', fontWeight: '700', fontSize: '14px', marginBottom: '20px', width: '100%', maxWidth: '500px' }}>
                        투표가 마감되었습니다.
                      </div>
                    ) : null}

                    <div className="ppt-options-grid">
                      {stage8Options.map((opt) => {
                        const isSelected = myVote8Option === opt.id;
                        const canVote = isVotingActive;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => canVote && handleVoteStage8(opt.id)}
                            disabled={!canVote}
                            className={`ppt-card-btn ${isSelected ? 'selected' : ''}`}
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: isSelected ? '#755e22' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#2b2315',
                              border: isSelected ? '2px solid #755e22' : '1px solid rgba(117, 94, 34, 0.1)',
                              borderRadius: '24px',
                              boxShadow: '0 8px 20px rgba(0,0,0,0.02)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              gap: '10px',
                              padding: '25px 15px',
                              minHeight: '130px'
                            }}
                          >
                            <span style={{ fontSize: '26px', fontWeight: '950', color: isSelected ? '#ffffff' : '#755e22' }}>
                              {opt.text}
                            </span>
                            {isSelected && (
                              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#ffffff', opacity: 0.9 }}>
                                선택됨
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // STAGE 9: 리얼선택 극장 종료 페이지 (리얼선택 극장 최종화면)
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', alignItems: 'center', justifyContent: 'center', minHeight: '45vh', animation: 'fadeIn 0.6s ease' }}>
                <div
                  className="pulsate-glow"
                  style={{
                    width: userId === "박재형_940721" ? '160px' : '100px',
                    height: userId === "박재형_940721" ? '160px' : '100px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#755e22',
                    borderRadius: '50%',
                    boxShadow: '0 10px 30px rgba(117, 94, 34, 0.15)',
                    marginBottom: '10px'
                  }}
                >
                  <Film size={userId === "박재형_940721" ? 70 : 40} color="white" />
                </div>

                <div style={{
                  position: 'relative',
                  padding: userId === "박재형_940721" ? '30px 100px' : '20px 60px',
                  borderTop: userId === "박재형_940721" ? '5px double #b4925a' : '3px double #b4925a',
                  borderBottom: userId === "박재형_940721" ? '5px double #b4925a' : '3px double #b4925a',
                  display: 'inline-block',
                  margin: '10px 0'
                }}>
                  <h1 style={{ fontSize: userId === "박재형_940721" ? '100px' : '42px', fontWeight: '950', color: '#755e22', letterSpacing: '8px', margin: 0, padding: 0 }}>
                    리얼선택 극장
                  </h1>
                </div>

                <div style={{ textAlign: 'center', color: '#2b2315', fontSize: userId === "박재형_940721" ? '28px' : '18px', fontWeight: '700', lineHeight: '1.8', whiteSpace: 'pre-line', marginTop: '10px' }}>
                  {userId === "박재형_940721"
                    ? "연극이 모두 성공적으로 끝났습니다.\n수고한 배우들과 참여해주신 모든 관객들께 박수를 보내주세요!"
                    : "연극이 모두 끝났습니다!\n오늘 함께해주셔서 대단히 감사합니다.\n\n수고해주신 주인공과 배우들에게 큰 박수를 부탁드립니다! 👏"}
                </div>

                {userId === "박재형_940721" && (
                  <button
                    onClick={handleEndTheater}
                    className="ppt-btn-solid"
                    style={{ width: '100%', maxWidth: '300px', height: '55px', fontSize: '16px', marginTop: '30px', backgroundColor: '#755e22' }}
                  >
                    연극 종료하기
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Admin Acrostic Detail Modal Pop-up */}
        {selectedAcrostic && (
          <div
            onClick={() => setSelectedAcrostic(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(43, 35, 21, 0.6)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              animation: 'fadeIn 0.3s ease'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#faf6f0',
                borderRadius: '32px',
                padding: '40px 50px',
                width: '100%',
                maxWidth: '650px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
              }}
            >
              <h2 style={{ fontSize: '24px', fontWeight: '950', color: '#755e22', marginBottom: '20px', textAlign: 'center' }}>
                {selectedAcrostic.userName}님의 삼행시
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', margin: '30px 0' }}>
                {selectedAcrostic.vote && Array.isArray(selectedAcrostic.vote) && selectedAcrostic.vote.map((line: string, lIdx: number) => (
                  <div key={lIdx} style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '24px', color: '#2b2315' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      background: '#755e22',
                      color: '#ffffff',
                      fontWeight: '950',
                      fontSize: '28px'
                    }}>
                      {winnerChars[lIdx] || ""}
                    </span>
                    <span style={{ fontWeight: '800' }}>{line}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSelectedAcrostic(null)}
                className="ppt-btn-solid"
                style={{ width: '100%', backgroundColor: '#755e22' }}
              >
                닫기
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (currentPage === 'memory') {
    const MEMORY_QUESTIONS = [
      "최근에 가장 감사했던 일은 무엇인가요?",
      "우리 공동체 안에서 가장 기억에 남는 일화는 무엇인가요?",
      "올해 특별히 기억에 남는 모임이나 사건이 있었나요?",
      "‘증인’으로 살아가면서 가장 어렵게 느끼는 부분은 무엇인가요?",
      "증인으로서 새롭게 시작해 보고 싶은 한 가지가 있다면 무엇인가요?",
      "앞으로 함께 나누고 싶은 기도제목이 있나요?"
    ];

    const currentStage = memoryConfig?.currentStage || 0;
    const isWritingPhase = currentStage >= 1 && currentStage <= 6;
    const isMatchingBridge = currentStage >= 7 && currentStage <= 17 && currentStage % 2 === 1;
    const isSharingPhase = currentStage >= 8 && currentStage <= 18 && currentStage % 2 === 0;

    let qNum: number | null = null;
    if (isWritingPhase) {
      qNum = currentStage;
    } else if (isMatchingBridge) {
      qNum = (currentStage - 5) / 2;
    } else if (isSharingPhase) {
      qNum = (currentStage - 6) / 2;
    }

    const currentQKey = qNum ? `q${qNum}` : null;
    const myCurrentAnswer = (localMemoryAnswers && currentQKey) ? (localMemoryAnswers[currentQKey] || "") : "";

    let myMatch: any = null;
    let spotNumber: number | null = null;
    let partnerText = "";
    if (isMatchingBridge && memoryConfig?.matches && userId) {
      myMatch = memoryConfig.matches.find((m: any) => m.u1Id === userId || m.u2Id === userId || m.u3Id === userId);
      if (myMatch) {
        spotNumber = myMatch.spot;
        const partners = [];
        if (myMatch.u1Id !== userId && myMatch.u1Name) partners.push(myMatch.u1Name);
        if (myMatch.u2Id !== userId && myMatch.u2Name) partners.push(myMatch.u2Name);
        if (myMatch.u3Id !== userId && myMatch.u3Name) partners.push(myMatch.u3Name);
        partnerText = partners.join(", ");
      }
    }

    let pageTitle = "기억의 조각 찾기";
    let pageSubtitle = "";

    if (currentStage === 0) {
      pageTitle = "기억의 조각 찾기";
      pageSubtitle = "우리 가운데 있었던 소중한 은혜의 조각들을 떠올려봅니다.\n화면의 질문을 보고 마음을 담아 답변을 작성해주세요.";
    } else if (isWritingPhase && qNum !== null) {
      pageTitle = `Q${qNum}. ${MEMORY_QUESTIONS[qNum - 1]}`;
    } else if (isMatchingBridge && qNum !== null) {
      pageTitle = "기억의 조각 모으기";
      pageSubtitle = "이제 작성한 조각들을 하나로 모을 시간입니다.\n잠시 후 서로의 이야기를 나눌 짝이 매칭됩니다.";
    } else if (isSharingPhase && qNum !== null) {
      pageTitle = `Q${qNum} 나눔`;
      pageSubtitle = `${MEMORY_QUESTIONS[qNum - 1]}`;
    } else if (currentStage === 19) {
      pageTitle = "기억의 조각 모으기 종료";
      pageSubtitle = "소중한 나눔을 통해 우리 공동체가 더욱 풍성해졌습니다.\n조끼리 모여서 못다한 나눔을 마무리하세요!";
    }

    return (
      <>
        <div className="bg-pattern" />
        {userId === "박재형_940721" && (
          <NavIcons
            userId={userId}
            isRecapMode={isRecapMode}
            toggleRecapMode={toggleRecapMode}
            setShowGroupingAdmin={setShowGroupingAdmin}
            setShowInfo={setShowInfo}
            setShowProfile={setShowProfile}
            onToggleTheater={handleToggleTheater}
            theaterActive={theaterConfig?.active}
            onToggleMemory={handleToggleMemory}
            memoryActive={memoryConfig?.active}
          />
        )}
        <div className="top-nav">
          {userId === "박재형_940721" && (
            <ChevronLeft className="nav-back" size={28} onClick={handleToggleMemory} />
          )}
        </div>

        <div className="ppt-theater-container" style={
          userId !== "박재형_940721"
            ? {
              padding: '20px 16px',
              minHeight: '100vh',
              height: '100vh',
              maxHeight: '100vh',
              width: '100vw',
              maxWidth: '100vw',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }
            : (userId === "박재형_940721" && memoryConfig?.matches?.length > 0
              ? { padding: '40px 24px 30px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }
              : {})
        }>
          <div className="ppt-card">
            {/* Slide Title */}
            <div className="ppt-phase-label" style={{ fontSize: '15px', color: '#b4925a', letterSpacing: '3px', marginBottom: '8px' }}>
              {currentStage >= 7 ? "기억의 조각 모으기" : "기억의 조각 찾기"}
            </div>
            <h1 className="ppt-title" style={{
              fontSize: userId === "박재형_940721" ? (memoryConfig?.matches?.length > 0 ? '36px' : '48px') : (isWritingPhase || isSharingPhase ? '24px' : '32px'),
              wordBreak: 'keep-all',
              lineHeight: '1.4',
              margin: userId === "박재형_940721" ? (memoryConfig?.matches?.length > 0 ? '12px 0' : '30px 0') : '10px 0'
            }}>
              {userId !== "박재형_940721" && isSharingPhase && qNum !== null
                ? `Q${qNum}. ${MEMORY_QUESTIONS[qNum - 1]}`
                : pageTitle}
            </h1>
            {/* Show question subtitle on Admin view during sharing stages */}
            {userId === "박재형_940721" && isSharingPhase && (
              <p style={{ fontSize: '20px', fontWeight: '750', color: '#615545', margin: '-10px 0 15px', whiteSpace: 'pre-line' }}>
                {pageSubtitle}
              </p>
            )}
            <div className="ppt-divider" style={userId === "박재형_940721" && memoryConfig?.matches?.length > 0 ? { margin: '8px auto 12px' } : {}} />

            {userId === "박재형_940721" ? (
              // ADMIN VIEW (Projector Slide View)
              <div>
                {((currentStage === 0 || currentStage === 19) || (isMatchingBridge && !(memoryConfig?.matches?.length > 0))) && (
                  <div style={{ padding: '60px 20px', textAlign: 'center', minHeight: '20vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: '28px', fontWeight: '750', color: '#615545', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                      {pageSubtitle}
                    </p>
                  </div>
                )}

                {/* Matches Seating Map during matching bridge stages */}
                {isMatchingBridge && memoryConfig?.matches?.length > 0 && (
                  <div style={{ marginTop: '0px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '850', color: '#755e22', marginBottom: '8px', textAlign: 'center' }}>
                      나눔 자리 배치도 ({memoryConfig?.matches?.length || 0}개 조 매칭됨)
                    </h3>

                    <div style={{
                      width: '100%',
                      maxWidth: '650px',
                      background: '#ffffff',
                      borderRadius: '20px',
                      border: '1px solid rgba(117, 94, 34, 0.1)',
                      padding: '12px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      {/* 강단 */}
                      <div style={{
                        background: '#e6e0d5',
                        color: '#755e22',
                        fontWeight: '800',
                        fontSize: '13px',
                        padding: '6px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        letterSpacing: '5px'
                      }}>
                        강 단
                      </div>

                      {/* 6x10 자리 그리드 (번호만 노출, 한 화면에 컴팩트하게 노출) */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '5px'
                      }}>
                        {Array.from({ length: 60 }, (_, i) => {
                          const spotNum = i + 1;
                          const match = memoryConfig?.matches?.find((m: any) => m.spot === spotNum);
                          return (
                            <div
                              key={spotNum}
                              style={{
                                padding: '5px 0',
                                background: match ? '#755e22' : '#f5f0e6',
                                color: match ? '#ffffff' : '#b4a58b',
                                borderRadius: '12px',
                                border: '1px solid rgba(117, 94, 34, 0.08)',
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '13px',
                                fontWeight: '900',
                                height: '30px',
                                boxShadow: match ? '0 4px 10px rgba(117, 94, 34, 0.15)' : 'none'
                              }}
                            >
                              {spotNum}
                            </div>
                          );
                        })}
                      </div>

                      {/* 출입구 */}
                      <div style={{
                        background: '#e6e0d5',
                        color: '#755e22',
                        fontWeight: '800',
                        fontSize: '13px',
                        padding: '6px',
                        borderRadius: '8px',
                        textAlign: 'center',
                        letterSpacing: '5px'
                      }}>
                        출 입 구
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Next/Prev Controller */}
                <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', marginTop: '20px', borderTop: '1px dashed rgba(117, 94, 34, 0.15)', paddingTop: '20px' }}>
                  {currentStage > 0 && (
                    <button
                      onClick={handlePrevMemoryStage}
                      className="ppt-btn-solid"
                      style={{ width: '150px', backgroundColor: '#8a8373', height: '48px', fontSize: '15px', padding: '0 12px', whiteSpace: 'nowrap' }}
                    >
                      이전 단계로
                    </button>
                  )}
                  {isMatchingBridge && (
                    <button
                      onClick={handleCreateMemoryMatches}
                      className="ppt-btn-solid"
                      style={{ width: '180px', backgroundColor: '#b4925a', height: '48px', fontSize: '15px', padding: '0 12px', whiteSpace: 'nowrap' }}
                    >
                      짝 매칭 하기
                    </button>
                  )}
                  <button
                    onClick={handleNextMemoryStage}
                    className="ppt-btn-solid"
                    style={{ width: '220px', backgroundColor: '#755e22', height: '48px', fontSize: '15px', padding: '0 12px', whiteSpace: 'nowrap' }}
                  >
                    {currentStage === 0 ? "시작하기" :
                      currentStage === 19 ? "게임 종료하기" : "다음 단계로 넘어 가기"}
                  </button>
                </div>
              </div>
            ) : (
              // USER VIEW
              <div>
                {currentStage === 0 ? (
                  // Cover Screen
                  <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#2b2315', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                      {pageSubtitle}
                    </p>
                  </div>
                ) : isWritingPhase ? (
                  // Answering Q1-Q6
                  <div>
                    {(myCurrentAnswer && !isEditingMemory) ? (
                      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '25px', maxWidth: '500px', margin: '20px auto', border: '1px solid rgba(117, 94, 34, 0.1)', boxShadow: '0 8px 24px rgba(117, 94, 34, 0.04)' }}>
                        <p style={{ fontSize: '15px', color: '#a2864c', fontWeight: '800', marginBottom: '10px' }}>나의 답변이 제출되었습니다</p>
                        <div style={{ fontSize: '18px', color: '#2b2315', fontWeight: '700', lineHeight: '1.6', wordBreak: 'break-all' }}>
                          "{myCurrentAnswer}"
                        </div>
                        <button
                          onClick={() => {
                            setMemoryInputText(myCurrentAnswer);
                            setIsEditingMemory(true);
                          }}
                          style={{ background: 'none', border: 'none', color: '#755e22', fontWeight: '800', fontSize: '13px', textDecoration: 'underline', marginTop: '20px', cursor: 'pointer' }}
                        >
                          답변 수정하기
                        </button>
                      </div>
                    ) : (
                      <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <textarea
                          placeholder="이 질문에 대한 답변을 40자 내외로 적어주세요..."
                          value={memoryInputText}
                          onChange={(e) => setMemoryInputText(e.target.value)}
                          maxLength={80}
                          style={{
                            width: '100%',
                            height: '120px',
                            borderRadius: '20px',
                            border: '1.5px solid rgba(117, 94, 34, 0.15)',
                            padding: '16px',
                            fontSize: '16px',
                            fontWeight: '600',
                            outline: 'none',
                            resize: 'none',
                            color: '#2b2315',
                            fontFamily: 'inherit',
                            background: '#ffffff'
                          }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#a2864c', fontWeight: '700' }}>
                          <span>글자 수: {memoryInputText.length}/80자</span>
                        </div>
                        <button
                          onClick={() => {
                            if (!memoryInputText.trim()) {
                              alert("답변을 입력해주세요!");
                              return;
                            }
                            if (qNum !== null) {
                              handleSubmitMemoryAnswer(qNum, memoryInputText);
                            }
                          }}
                          className="ppt-btn-solid"
                          style={{ height: '55px', fontSize: '16px' }}
                        >
                          제출하기
                        </button>
                      </div>
                    )}
                  </div>
                ) : isMatchingBridge ? (
                  // Bridge Screen / Waiting with partner match reveal
                  <div style={{ padding: '20px 10px', textAlign: 'center' }}>
                    {myMatch ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.5s ease' }}>
                        <div style={{
                          background: 'linear-gradient(135deg, #755e22 0%, #5d4a1b 100%)',
                          color: '#ffffff',
                          padding: '45px 20px',
                          borderRadius: '32px',
                          boxShadow: '0 20px 50px rgba(117, 94, 34, 0.25)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '15px'
                        }}>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: '#f5e8cf', letterSpacing: '2px', textTransform: 'uppercase' }}>
                            📍 배정된 나눔 자리
                          </div>
                          <div style={{ fontSize: '84px', fontWeight: '950', display: 'flex', alignItems: 'baseline', justifyContent: 'center', margin: '10px 0', lineHeight: 1 }}>
                            {spotNumber}
                            <span style={{ fontSize: '24px', fontWeight: '800', marginLeft: '6px', color: '#f5e8cf' }}>번 자리</span>
                          </div>
                          <div style={{ width: '40px', height: '1.5px', background: 'rgba(245, 232, 207, 0.3)', margin: '10px auto' }} />
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#f5e8cf', letterSpacing: '1px' }}>
                            👥 나의 매칭 짝
                          </div>
                          <div style={{ fontSize: '38px', fontWeight: '950', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', letterSpacing: '-0.5px' }}>
                            {partnerText}
                          </div>
                        </div>
                        <p style={{ fontSize: '16px', fontWeight: '750', color: '#755e22', lineHeight: '1.7', margin: '10px 0' }}>
                          지정된 번호 자리로 가셔서<br />
                          짝과 함께 곧 시작될 나눔을 대기해주세요!
                        </p>
                      </div>
                    ) : (
                      <div style={{ padding: '40px 20px' }}>
                        <p style={{ fontSize: '18px', fontWeight: '750', color: '#2b2315', whiteSpace: 'pre-line', lineHeight: '1.8' }}>
                          {pageSubtitle}
                        </p>
                      </div>
                    )}
                  </div>
                ) : isSharingPhase ? (
                  // Sharing matched pairs
                  <div style={{ maxWidth: '500px', margin: '0 auto', padding: '10px 0' }}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '24px',
                      padding: '30px 24px',
                      textAlign: 'center',
                      boxShadow: '0 8px 32px rgba(117, 94, 34, 0.06)',
                      border: '1px solid rgba(117, 94, 34, 0.1)'
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#2b2315',
                        lineHeight: '1.8',
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {myCurrentAnswer ? `"${myCurrentAnswer}"` : "작성된 답변이 없습니다."}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Stage 19: End Screen & Review (showing Q1 to Q6 list)
                  <div style={{ padding: '0', textAlign: 'center', width: '100%' }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      maxWidth: '500px',
                      margin: '0 auto',
                      padding: '0',
                      width: '100%'
                    }}>
                      {MEMORY_QUESTIONS.map((question, index) => {
                        const qIndex = index + 1;
                        const answer = localMemoryAnswers[`q${qIndex}`] || "";

                        return (
                          <div
                            key={qIndex}
                            onClick={() => {
                              setSelectedReviewQNum(qIndex);
                              setModalInputText(answer);
                              setIsEditingInModal(false);
                            }}
                            style={{
                              background: '#ffffff',
                              borderRadius: '12px',
                              padding: '8px 16px',
                              border: '1px solid rgba(117, 94, 34, 0.12)',
                              boxShadow: '0 2px 8px rgba(117, 94, 34, 0.02)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1px',
                              alignItems: 'stretch',
                              transition: 'all 0.2s ease',
                              width: '100%'
                            }}
                            className="review-card-hover"
                          >
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '800',
                              color: '#a2864c',
                              letterSpacing: '1px',
                              textAlign: 'left'
                            }}>
                              QUESTION 0{qIndex}
                            </span>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '750',
                              color: '#2b2315',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              textAlign: 'left',
                              width: '100%'
                            }}>
                              {question}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedReviewQNum !== null && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedReviewQNum(null)}
            style={{ zIndex: 2000 }}
          >
            <div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '420px',
                padding: '30px 24px',
                background: '#fdfbf7',
                border: '3px double #755e22',
                borderRadius: '24px',
                position: 'relative'
              }}
            >
              <button
                className="modal-close"
                onClick={() => setSelectedReviewQNum(null)}
                style={{ top: '16px', right: '16px' }}
              >
                <X size={20} />
              </button>

              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: '950',
                    background: '#755e22',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    letterSpacing: '1px'
                  }}>
                    QUESTION 0{selectedReviewQNum}
                  </span>
                </div>

                <h3 style={{
                  fontSize: '17px',
                  fontWeight: '850',
                  color: '#2b2315',
                  lineHeight: '1.4',
                  margin: '0 0 10px'
                }}>
                  {MEMORY_QUESTIONS[selectedReviewQNum - 1]}
                </h3>

                {(localMemoryAnswers[`q${selectedReviewQNum}`] && !isEditingInModal) ? (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '20px',
                      border: '1.5px solid rgba(117, 94, 34, 0.15)',
                      boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.01)',
                      minHeight: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <p style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#2b2315',
                        lineHeight: '1.6',
                        width: '100%',
                        wordBreak: 'break-all',
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        margin: 0
                      }}>
                        "{localMemoryAnswers[`q${selectedReviewQNum}`]}"
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setModalInputText(localMemoryAnswers[`q${selectedReviewQNum}`] || "");
                        setIsEditingInModal(true);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#755e22',
                        fontWeight: '800',
                        fontSize: '13px',
                        textDecoration: 'underline',
                        alignSelf: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      답변 수정하기
                    </button>
                  </div>
                ) : (
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <textarea
                      placeholder="이 질문에 대한 답변을 40자 내외로 적어주세요..."
                      value={modalInputText}
                      onChange={(e) => setModalInputText(e.target.value)}
                      maxLength={80}
                      style={{
                        width: '100%',
                        height: '110px',
                        borderRadius: '16px',
                        border: '1.5px solid rgba(117, 94, 34, 0.15)',
                        padding: '12px',
                        fontSize: '15px',
                        fontWeight: '600',
                        outline: 'none',
                        resize: 'none',
                        color: '#2b2315',
                        fontFamily: 'inherit',
                        background: '#ffffff'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#a2864c', fontWeight: '700' }}>
                      <span>글자 수: {modalInputText.length}/80자</span>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                      {localMemoryAnswers[`q${selectedReviewQNum}`] && (
                        <button
                          onClick={() => setIsEditingInModal(false)}
                          className="ppt-btn-solid"
                          style={{
                            height: '45px',
                            fontSize: '14px',
                            background: '#8a8373',
                            flex: 1
                          }}
                        >
                          취소
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (!modalInputText.trim()) {
                            alert("답변을 입력해주세요!");
                            return;
                          }
                          handleSubmitMemoryAnswer(selectedReviewQNum, modalInputText);
                          setIsEditingInModal(false);
                          setSelectedReviewQNum(null);
                        }}
                        className="ppt-btn-solid"
                        style={{
                          height: '45px',
                          fontSize: '14px',
                          background: '#755e22',
                          flex: 2
                        }}
                      >
                        저장하기
                      </button>
                    </div>
                  </div>
                )}

                {!isEditingInModal && (
                  <button
                    onClick={() => setSelectedReviewQNum(null)}
                    className="ppt-btn-solid"
                    style={{
                      height: '45px',
                      fontSize: '14px',
                      marginTop: '10px',
                      background: '#755e22'
                    }}
                  >
                    확인 완료
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
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
  onToggleTheater?: () => void;
  theaterActive?: boolean;
  onToggleMemory?: () => void;
  memoryActive?: boolean;
}

const NavIcons = ({
  userId,
  isRecapMode,
  toggleRecapMode,
  setShowGroupingAdmin,
  setShowInfo,
  setShowProfile,
  onToggleTheater,
  theaterActive,
  onToggleMemory,
  memoryActive
}: NavIconsProps) => (
  <nav className="navbar">
    {userId === "박재형_940721" && (
      <>
        {onToggleTheater && (
          <Film
            className="nav-icon"
            size={24}
            onClick={onToggleTheater}
            style={{ color: theaterActive ? '#ff4d4d' : 'inherit', marginRight: '8px' }}
          />
        )}
        {onToggleMemory && (
          <Search
            className="nav-icon"
            size={24}
            onClick={onToggleMemory}
            style={{ color: memoryActive ? '#ff4d4d' : 'inherit', marginRight: '8px' }}
          />
        )}
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
          style={{ color: isRecapMode ? '#ff4d4d' : 'inherit', marginRight: '8px' }}
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
  handleAIGrouping: (keywords: string[], members: number, groups: number, participantsList: any[]) => Promise<any>;
  groupData: any;
  participants: any[];
  usersMap: Record<string, any>;
  geminiApiKey: string;
  setGeminiApiKey: (val: string) => void;
}

const GroupingAdminModal = ({ show, onClose, isProcessing, setIsProcessing, handleAIGrouping, groupData, participants, usersMap, geminiApiKey, setGeminiApiKey }: GroupingAdminModalProps) => {
  const [keyword1, setKeyword1] = useState("");
  const [keyword2, setKeyword2] = useState("");
  const [keyword3, setKeyword3] = useState("");
  const [membersPerGroup, setMembersPerGroup] = useState(5);
  const [totalGroups, setTotalGroups] = useState(20);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'result'>('grid');
  const [localAssignments, setLocalAssignments] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // 관리자 탭 상태: 'group' (그룹 편성) | 'manage' (참가자 관리)
  const [activeTab, setActiveTab] = useState<'group' | 'manage'>('group');

  // 참가자 관리 상태
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberBirth, setNewMemberBirth] = useState("");
  const [manageSearch, setManageSearch] = useState("");
  const [isSavingMember, setIsSavingMember] = useState(false);

  // 드래그 앤 드롭 상태
  const [dragOverGroupId, setDragOverGroupId] = useState<number | null>(null);

  useEffect(() => {
    if (show) {
      if (groupData && groupData.length > 0) {
        setLocalAssignments(groupData);
        setViewMode('result');
      } else {
        setLocalAssignments([]);
        setViewMode('grid');
      }
    }
  }, [show, groupData]);

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
      const assignments = await handleAIGrouping(keywords, membersPerGroup, totalGroups, participants);
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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMemberName.trim();
    const birth = newMemberBirth.trim();
    if (!name) {
      alert("이름을 입력해주세요.");
      return;
    }
    if (birth.length !== 6 || isNaN(Number(birth))) {
      alert("생년월일 6자리를 올바르게 입력해주세요 (예: 990101).");
      return;
    }

    const exists = participants.some(p => p.name === name && p.birthdate === birth);
    if (exists) {
      alert("이미 동일한 이름과 생년월일로 등록된 인원이 존재합니다.");
      return;
    }

    setIsSavingMember(true);
    try {
      const memberKey = `${name}_${birth}`;
      await setDoc(doc(db, 'participants', memberKey), {
        name,
        birthdate: birth,
        photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=participant_${name}`,
        createdAt: serverTimestamp()
      });
      setNewMemberName("");
      setNewMemberBirth("");
      alert(`${name}님이 성공적으로 등록되었습니다.`);
    } catch (err) {
      console.error("Error adding participant:", err);
      alert("인원 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleDeleteMember = async (pName: string, pBirth: string) => {
    if (!window.confirm(`${pName}님을 정말 삭제하시겠습니까? 로그인 정보 및 기존 정보가 삭제됩니다.`)) {
      return;
    }
    try {
      const memberKey = `${pName}_${pBirth}`;
      await deleteDoc(doc(db, 'participants', memberKey));
      alert("삭제되었습니다.");
    } catch (err) {
      console.error("Error deleting participant:", err);
      alert("인원 삭제 중 오류가 발생했습니다.");
    }
  };

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: React.DragEvent, member: any, fromGroupId: number) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ member, fromGroupId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, toGroupId: number) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("text/plain");
    if (!dataStr) return;
    try {
      const { member, fromGroupId } = JSON.parse(dataStr);
      if (fromGroupId === toGroupId) return;

      setLocalAssignments(prev => {
        return prev.map(m => {
          if (m.name === member.name && m.birthdate === member.birthdate) {
            return { ...m, groupId: toGroupId };
          }
          return m;
        });
      });
    } catch (err) {
      console.error("Drag and drop error:", err);
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
                등록 인원: {participants.length}명
              </div>
              <button
                onClick={onClose}
                style={{ background: '#f5f0e6', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#755e22', transition: 'all 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
              >
                <X size={26} />
              </button>
            </div>

            <div style={{ padding: '60px 20px 20px', textAlign: 'center' }}>
              <h2 style={{ color: '#755e22', fontFamily: 'serif', fontSize: '42px', margin: 0, letterSpacing: '-1.5px', whiteSpace: 'nowrap' }}>빛의 동역자</h2>
              <p style={{ color: '#a09478', fontSize: '17px', marginTop: '12px', fontWeight: '500', margin: '12px 0 0' }}>서로가 서로의 빛이 되는 소중한 만남</p>
            </div>

            {/* 탭 네비게이션 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', borderBottom: '1px solid #f9f6f0', padding: '0 40px 15px', zIndex: 10 }}>
              <button
                onClick={() => setActiveTab('group')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: activeTab === 'group' ? '800' : '500',
                  color: activeTab === 'group' ? '#755e22' : '#8b7e58',
                  borderBottom: activeTab === 'group' ? '2.5px solid #755e22' : '2.5px solid transparent',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                그룹 편성
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: activeTab === 'manage' ? '800' : '500',
                  color: activeTab === 'manage' ? '#755e22' : '#8b7e58',
                  borderBottom: activeTab === 'manage' ? '2.5px solid #755e22' : '2.5px solid transparent',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                참가자 관리
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', width: '100%', padding: '20px 40px', position: 'relative' }}>
              <AnimatePresence mode="wait">
                {activeTab === 'group' ? (
                  viewMode === 'grid' ? (
                    <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'relative' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '12px' }}>
                        {participants.map((p, i) => {
                          const userKey = `${p.name}_${p.birthdate}`;
                          const photoUrl = usersMap[userKey]?.profileImage || DEFAULT_AVATAR;
                          return (
                            <motion.div key={`p-${i}`} layoutId={`photo-${p.name}_${p.birthdate}`} onClick={() => setPreviewPhoto(photoUrl)} style={{ cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                              <motion.img
                                src={photoUrl}
                                style={{ width: '100%', borderRadius: '15px', border: '1px solid #f0e6d2', aspectRatio: '1/1', objectFit: 'cover' }}
                                animate={isScanning ? {
                                  filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
                                  scale: [1, 1.08, 1],
                                  borderColor: ['#f0e6d2', '#755e22', '#f0e6d2']
                                } : {}}
                                transition={isScanning ? { repeat: Infinity, duration: 2, delay: i * 0.02 } : {}}
                                alt={p.name}
                              />
                              <div style={{ fontSize: '11px', marginTop: '6px', color: '#8b7e58', fontWeight: '500' }}>{p.name}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                      {isScanning && <motion.div className="premium-scan-line" initial={{ top: '-10%' }} animate={{ top: '110%' }} transition={{ duration: 4, ease: "linear", repeat: Infinity }} />}
                    </motion.div>
                  ) : (
                    <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '30px', paddingBottom: '120px' }}>
                      {sortedGroupIds.map((gid) => (
                        <motion.div
                          key={`g-${gid}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            background: dragOverGroupId === Number(gid) ? '#f5ede0' : '#fdfbf7',
                            borderRadius: '30px',
                            padding: '25px',
                            border: dragOverGroupId === Number(gid) ? '2px dashed #755e22' : '1px solid #f0e6d2',
                            boxShadow: '0 15px 35px rgba(0,0,0,0.03)',
                            transition: 'all 0.2s ease'
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragOverGroupId !== Number(gid)) setDragOverGroupId(Number(gid));
                          }}
                          onDragLeave={() => setDragOverGroupId(null)}
                          onDrop={(e) => {
                            setDragOverGroupId(null);
                            handleDrop(e, Number(gid));
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#755e22', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 'bold' }}>{gid}</div>
                            <h3 style={{ fontSize: '20px', color: '#755e22', margin: 0, fontFamily: 'serif' }}>조 동역자</h3>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                            {groupedMembers[gid].map((member: any, idx: number) => {
                              const memberKey = `${member.name}_${member.birthdate}`;
                              const photoUrl = usersMap[memberKey]?.profileImage || DEFAULT_AVATAR;
                              return (
                                <div
                                  key={`m-${gid}-${idx}`}
                                  style={{ textAlign: 'center', cursor: 'grab', userSelect: 'none' }}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, member, Number(gid))}
                                >
                                  <img src={photoUrl} style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%', border: '3px solid #fff', boxShadow: '0 6px 15px rgba(0,0,0,0.1)', objectFit: 'cover' }} alt={member.name} />
                                  <div style={{ fontSize: '12px', marginTop: '8px', color: '#444', fontWeight: '600' }}>{member.name}</div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      ))}
                    </motion.div>
                  )
                ) : (
                  // 참가자 관리 화면
                  <motion.div
                    key="manage"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '40px', paddingBottom: '60px' }}
                  >
                    {/* 좌측: 등록 폼 */}
                    <div style={{ background: '#fdfbf7', border: '1px solid #f0e6d2', borderRadius: '24px', padding: '30px', height: 'fit-content' }}>
                      <h3 style={{ fontSize: '18px', color: '#755e22', fontFamily: 'serif', marginBottom: '20px' }}>새로운 인원 등록</h3>
                      <form onSubmit={handleAddMember} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', color: '#8b7e58', fontWeight: '600' }}>이름</label>
                          <input
                            type="text"
                            placeholder="예: 홍길동"
                            value={newMemberName}
                            onChange={(e) => setNewMemberName(e.target.value)}
                            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e6e0d5', fontSize: '14px', outline: 'none', background: '#fff' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '13px', color: '#8b7e58', fontWeight: '600' }}>생년월일 (6자리)</label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="예: 990101"
                            value={newMemberBirth}
                            onChange={(e) => setNewMemberBirth(e.target.value)}
                            style={{ padding: '14px', borderRadius: '12px', border: '1px solid #e6e0d5', fontSize: '14px', outline: 'none', background: '#fff' }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSavingMember}
                          style={{ marginTop: '10px', padding: '15px', borderRadius: '12px', background: '#755e22', color: '#fff', border: 'none', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(117, 94, 34, 0.15)' }}
                        >
                          {isSavingMember ? "등록 중..." : "등록하기"}
                        </button>
                      </form>
                    </div>

                    {/* 우측: 리스트 & 검색 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="등록된 인원 이름 검색..."
                          value={manageSearch}
                          onChange={(e) => setManageSearch(e.target.value)}
                          style={{ width: '100%', padding: '14px 14px 14px 44px', borderRadius: '15px', border: '1px solid #e6e0d5', fontSize: '14px', outline: 'none', background: '#fdfbf7' }}
                        />
                        <Search size={16} color="#a2864c" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
                      </div>

                      <div
                        style={{
                          maxHeight: '480px',
                          overflowY: 'auto',
                          border: '1px solid #f0e6d2',
                          borderRadius: '24px',
                          background: '#fff',
                          padding: '10px'
                        }}
                      >
                        {participants.filter(p => p.name.toLowerCase().includes(manageSearch.toLowerCase())).length === 0 ? (
                          <div style={{ padding: '40px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                            검색 결과가 없습니다.
                          </div>
                        ) : (
                          participants
                            .filter(p => p.name.toLowerCase().includes(manageSearch.toLowerCase()))
                            .map((p, idx) => {
                              const userKey = `${p.name}_${p.birthdate}`;
                              const photoUrl = usersMap[userKey]?.profileImage || DEFAULT_AVATAR;
                              return (
                                <div
                                  key={idx}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 16px',
                                    borderBottom: '1px solid #f9f6f0',
                                    borderRadius: '12px',
                                    transition: 'background-color 0.2s'
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fdfbf7'; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img
                                      src={photoUrl}
                                      style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #e6e0d5' }}
                                      alt={p.name}
                                    />
                                    <div>
                                      <div style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>{p.name}</div>
                                      <div style={{ fontSize: '12px', color: '#888' }}>{p.birthdate}</div>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteMember(p.name, p.birthdate)}
                                    style={{ background: 'none', border: 'none', color: '#d9534f', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '6px 12px', borderRadius: '8px', transition: 'all 0.2s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fdf2f2'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                  >
                                    삭제
                                  </button>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {activeTab === 'group' && (
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 2 }}>
                        <span style={{ fontSize: '14px', color: '#666', fontWeight: '600', whiteSpace: 'nowrap' }}>API Key</span>
                        <input
                          type="password"
                          value={geminiApiKey}
                          onChange={(e) => {
                            setGeminiApiKey(e.target.value);
                            localStorage.setItem('GEMINI_API_KEY', e.target.value);
                          }}
                          placeholder="Gemini API Key"
                          style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #e6e0d5', fontSize: '14px', outline: 'none', background: '#fdfbf7' }}
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
            )}
          </motion.div>
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
  usersMap: Record<string, any>;
}

const MyGroupModal = ({ show, onClose, groupData, userId, usersMap }: MyGroupModalProps) => {
  if (!groupData || !userId) return null;
  const myAssignment = groupData.find((a: any) => `${a.name}_${a.birthdate}` === userId);
  if (!myAssignment) return (
    show && (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column', width: '90%', maxWidth: '400px', position: 'relative', padding: '32px 24px 24px', background: '#fdf8f1', borderRadius: '28px', boxShadow: '0 25px 60px rgba(117, 94, 34, 0.15)' }} onClick={e => e.stopPropagation()}>
          <button className="modal-close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#755e22', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}><X size={24} /></button>
          <p style={{ marginTop: '20px', fontWeight: '600', color: '#8b7e58', textAlign: 'center' }}>아직 그룹이 편성되지 않았거나 명단에 없습니다.</p>
        </div>
      </div>
    )
  );
  const myGroupMembers = groupData.filter((a: any) => a.groupId === myAssignment.groupId);
  return (
    show && (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column', width: '90%', maxWidth: '400px', position: 'relative', padding: '32px 24px 24px', background: '#fdf8f1', borderRadius: '28px', boxShadow: '0 25px 60px rgba(117, 94, 34, 0.15)' }} onClick={e => e.stopPropagation()}>
          <button className="modal-close" style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#755e22', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
            <X size={24} />
          </button>

          <div style={{ marginBottom: '20px', textAlign: 'center', flexShrink: 0 }}>
            <h2 style={{ color: '#755e22', fontSize: '22px', fontWeight: '800', fontFamily: 'serif' }}>나의 그룹: {myAssignment.groupId}조</h2>
            <p style={{ color: '#8b7e58', fontSize: '13px', marginTop: '4px', fontWeight: '500' }}>함께 빛의 여정을 떠날 동역자들입니다.</p>
          </div>

          <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            overflowY: 'auto',
            flex: 1,
            paddingRight: '6px',
            textAlign: 'left'
          }} className="custom-scrollbar">
            {myGroupMembers.map((member: any, i: number) => {
              const memberKey = `${member.name}_${member.birthdate}`;
              const photoUrl = usersMap[memberKey]?.profileImage || DEFAULT_AVATAR;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', background: '#f6f0e3', borderRadius: '18px', border: '1px solid rgba(117, 94, 34, 0.08)' }}>
                  <img
                    src={photoUrl}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}
                    alt={member.name}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <span style={{ fontWeight: '700', color: '#2b2315', fontSize: '15px' }}>{member.name}</span>
                    {memberKey === userId && (
                      <span style={{ fontSize: '11px', color: '#755e22', background: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: '800', border: '1px solid rgba(117, 94, 34, 0.15)' }}>
                        나
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )
  );
};

export default App
