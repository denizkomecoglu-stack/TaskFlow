import axios from 'axios';

const api = axios.create({
    baseURL: 'https://taskflow-vio5.onrender.com/api',
    withCredentials: true, //gizli çerezleri otomatik olarak sunucuya gönderir

});

export default api;
