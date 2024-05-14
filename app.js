document.addEventListener('DOMContentLoaded', function () {
    let bookList = [];

    function startScanner() {
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: document.querySelector('#interactive'),
                constraints: {
                    facingMode: "environment"
                }
            },
            decoder: {
                readers: ["ean_reader"]
            },
            locate: true
        }, function (err) {
            if (err) {
                console.error('Quagga init error:', err);
                return;
            }
            console.log("Initialization finished. Ready to start");
            Quagga.start();
        });
    }

    function continueScanner() {
        Quagga.start();
    }

    Quagga.onDetected(function (result) {
        let isbn = result.codeResult.code;
        // ISBN numarasının daha önce okutulup okutulmadığını kontrol et
        if (bookList.some(book => book.isbn === isbn)) {
            alert("Bu ISBN numarası zaten okutuldu.");
        } else {
            fetchBookInfo(isbn);
        }
        Quagga.stop();
    });

    async function fetchBookInfo(isbn) {
        try {
            let response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
            let data = await response.json();
            if (data.items && data.items.length > 0) {
                let volumeInfo = data.items[0].volumeInfo;
                let bookInfo = {
                    isbn: isbn,
                    title: volumeInfo.title,
                    authors: volumeInfo.authors.join(', '),
                    publisher: volumeInfo.publisher,
                    publishedDate: volumeInfo.publishedDate,
                    description: volumeInfo.description,
                    pageCount: volumeInfo.pageCount,
                    categories: volumeInfo.categories ? volumeInfo.categories.join(', ') : '',
                    averageRating: volumeInfo.averageRating,
                    ratingsCount: volumeInfo.ratingsCount,
                    language: volumeInfo.language,
                    previewLink: volumeInfo.previewLink,
                    infoLink: volumeInfo.infoLink,
                    thumbnail: volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail : ''
                };
                bookList.push(bookInfo);
                displayResults(bookInfo);
            } else {
                fetchOpenLibrary(isbn);
            }
        } catch (error) {
            console.error('Google Books API error:', error);
            continueScanner();
        }
    }

    async function fetchOpenLibrary(isbn) {
        try {
            let response = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
            let data = await response.json();
            let bookInfo = data[`ISBN:${isbn}`];
            if (bookInfo) {
                bookInfo = {
                    isbn: isbn,
                    title: bookInfo.title,
                    authors: bookInfo.authors ? bookInfo.authors.map(author => author.name).join(', ') : '',
                    publish_date: bookInfo.publish_date,
                    number_of_pages: bookInfo.number_of_pages,
                    publishers: bookInfo.publishers ? bookInfo.publishers.map(publisher => publisher.name).join(', ') : '',
                    subjects: bookInfo.subjects ? bookInfo.subjects.map(subject => subject.name).join(', ') : '',
                    cover: bookInfo.cover ? bookInfo.cover.large : ''
                };
                bookList.push(bookInfo);
                displayResults(bookInfo);
            } else {
                alert("Kitap bulunamadı.");
                continueScanner();
            }
        } catch (error) {
            console.error('Open Library API error:', error);
            continueScanner();
        }
    }

    function displayResults(bookInfo) {
        let resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = `
            <div class="book-info">
                <img class="book-cover" src="${bookInfo.thumbnail || bookInfo.cover || 'default-cover.jpg'}" alt="Kapak Resmi">
                <div class="book-details">
                    <h2>${bookInfo.title}</h2>
                    <p><strong>Yazar:</strong> ${bookInfo.authors || 'Bilinmiyor'}</p>
                    <p><strong>Yayınevi:</strong> ${bookInfo.publisher || 'Bilinmiyor'}</p>
                    <p><strong>Yayın Tarihi:</strong> ${bookInfo.publishedDate || bookInfo.publish_date || 'Bilinmiyor'}</p>
                    <p><strong>Açıklama:</strong> ${bookInfo.description || 'Yok'}</p>
                    <p><strong>Sayfa Sayısı:</strong> ${bookInfo.pageCount || bookInfo.number_of_pages || 'Bilinmiyor'}</p>
                    <p><strong>Kategoriler:</strong> ${bookInfo.categories || bookInfo.subjects || 'Yok'}</p>
                    <p><strong>Dil:</strong> ${bookInfo.language || 'Bilinmiyor'}</p>
                    <a class="book-link" href="${bookInfo.previewLink || bookInfo.infoLink || '#'}" target="_blank">Kitap Linki</a>
                </div>
            </div>
            <div class="actions">
                <button onclick="continueReading()">Devam</button>
                <button onclick="saveAndExit()">Sonlandır</button>
            </div>
        `;
    }

    window.continueReading = function () {
        let resultsDiv = document.getElementById('results');
        resultsDiv.innerHTML = ''; // Kitap bilgilerini temizle
        continueScanner(); // Kamera iznini yeniden istemeden tarayıcıyı başlat
    };

    window.saveAndExit = function () {
        let wb = XLSX.utils.book_new();
        let wsData = [["ISBN", "Kitap İsmi", "Yazar", "Yayınevi", "Yayın Tarihi", "Açıklama", "Sayfa Sayısı", "Kategoriler", "Dil"]];
        bookList.forEach(book => {
            wsData.push([book.isbn, book.title, book.authors, book.publisher, book.publishedDate || book.publish_date, book.description || '', book.pageCount || book.number_of_pages, book.categories || book.subjects || '', book.language]);
        });
        let ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "ISBNs");
        XLSX.writeFile(wb, "ISBN_List.xlsx");
    };

    startScanner();
});
